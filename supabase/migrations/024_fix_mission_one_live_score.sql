-- =========================================================
-- Fix Mission 01 live score drift.
--
-- public.recompute_mission_1_live_score() is fired by three
-- triggers (mission_1_live_evidence/theory/containment, defined in
-- 20261009045543_remote_schema.sql) every time a player saves a
-- change to mission_evidence_reviews, mission_theories or
-- mission_containment -- i.e. it recomputes leaderboard_entries.
-- mission_1_score live, after each stage, while the mission is
-- still in progress.
--
-- That SQL function was never updated when the real scoring rules
-- in src/app/api/missions/1/complete/route.ts (the function that
-- computes the authoritative, final score on submission) were
-- changed. Three concrete mismatches caused the live score shown
-- during play to disagree with the real/final score:
--
-- 1. Evidence: E-03 was still scored as a 'Suspicious'/'Relevant'
--    compromise indicator. The current game treats E-03 (MFA) as a
--    legitimate control, i.e. correct only when classified
--    'Cleared' -- see complete/route.ts's correctEvidence map.
--
-- 2. Theory "strongest evidence" bonus: scored E-02/E-03/E-04 as the
--    three strongest indicators. The current answer key is
--    E-02/E-04/E-07 (E-03 is no longer a compromise indicator, see
--    above).
--
-- 3. Theory "phishing email analysis" (the old "attack sequence")
--    score: checked a fixed array position against legacy card ids
--    ('phishing_email','fake_login','credentials_stolen',
--    'mfa_approved','attacker_login','restricted_access',
--    'external_share') that the live UI
--    (components/mission-one/MissionOneTheory.tsx) no longer writes.
--    The live UI instead writes a subset of 7 part ids
--    ('sender_domain','external_warning','unexpected_attachment',
--    'unusual_time','urgent_language','verify_button','fake_url')
--    and complete/route.ts scores it by presence, not position. The
--    old positional check almost always scored 0 against the new
--    ids, understating the live theory score.
--
-- 4. Containment: checked the legacy action ids
--    ('revoke_sessions','reset_credentials','preserve_logs',
--    'disable_account' / 'delete_logs','ignore','shutdown_network').
--    The live UI (components/mission-one/MissionOneContainment.tsx)
--    writes 'maya_*' ids instead, so the live containment score was
--    always 0 regardless of what the player chose.
--
-- This migration replaces only recompute_mission_1_live_score()'s
-- body with logic that matches complete/route.ts exactly. It does
-- not touch live_score_from_evidence/theory/containment() (the
-- trigger shims that call it), sync_mission_1_leaderboard() (fired
-- on final submission, already correct since it just copies
-- whatever total complete/route.ts computed), or any trigger
-- definition. "create or replace" is safe regardless of whether a
-- player's live score was already wrong -- the next stage save
-- after this migration runs will recompute it correctly.
-- =========================================================

create or replace function public.recompute_mission_1_live_score(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $recompute_mission_1_live_score$
declare
  v_alias text;
  v_role text;

  v_evidence_score integer := 0;
  v_theory_score integer := 0;
  v_sequence_score integer := 0;
  v_containment_score integer := 0;

  v_correct_reviews integer := 0;
  v_correct_positions integer := 0;
  v_strongest_correct integer := 0;

  v_attack_method text;
  v_initial_compromise text;
  v_strongest_evidence text[];
  v_attack_sequence text[];
  v_actions text[];

  v_total integer := 0;
  v_completed integer := 0;
begin

  -- -------------------------------------------------------
  -- VERIFY THIS IS A PLAYER, NOT AN ADMIN
  -- -------------------------------------------------------

  select
    alias,
    role
  into
    v_alias,
    v_role
  from public.profiles
  where id = p_player_id;

  if v_role is distinct from 'player' then
    delete from public.leaderboard_entries
    where player_id = p_player_id;

    return;
  end if;


  -- -------------------------------------------------------
  -- EVIDENCE SCORE
  -- Maximum: 500
  -- 50 points per correct evidence classification.
  -- E-03 (MFA) is a legitimate control -- correct only as
  -- 'Cleared', matching complete/route.ts's correctEvidence map.
  -- -------------------------------------------------------

  select count(*)::integer
  into v_correct_reviews
  from public.mission_evidence_reviews
  where player_id = p_player_id
    and mission_id = 1
    and (
      (evidence_id = 'E-01' and classification = 'Cleared')

      or (
        evidence_id = 'E-02'
        and classification in ('Suspicious', 'Relevant')
      )

      or (
        evidence_id = 'E-03'
        and classification = 'Cleared'
      )

      or (
        evidence_id = 'E-04'
        and classification in ('Suspicious', 'Relevant')
      )

      or (
        evidence_id = 'E-05'
        and classification = 'Cleared'
      )

      or (
        evidence_id = 'E-06'
        and classification = 'Cleared'
      )

      or (
        evidence_id = 'E-07'
        and classification in ('Suspicious', 'Relevant')
      )

      or (
        evidence_id = 'E-08'
        and classification = 'Cleared'
      )

      or (
        evidence_id = 'E-09'
        and classification in ('Suspicious', 'Relevant')
      )

      or (
        evidence_id = 'E-10'
        and classification = 'Relevant'
      )
    );

  v_evidence_score :=
    round(
      (
        v_correct_reviews::numeric
        / 10
      ) * 500
    );


  -- -------------------------------------------------------
  -- LOAD THEORY
  -- -------------------------------------------------------

  select
    attack_method,
    initial_compromise,
    strongest_evidence,
    attack_sequence
  into
    v_attack_method,
    v_initial_compromise,
    v_strongest_evidence,
    v_attack_sequence
  from public.mission_theories
  where player_id = p_player_id
    and mission_id = 1;


  -- -------------------------------------------------------
  -- THEORY SCORE
  -- Maximum: 600
  -- -------------------------------------------------------

  if v_attack_method = 'Phishing' then
    v_theory_score :=
      v_theory_score + 150;
  end if;


  if v_initial_compromise =
    'The fake Project Horizon document link'
  then
    v_theory_score :=
      v_theory_score + 150;
  end if;


  -- Strongest evidence - 150 (50 each). E-03 is Cleared, so it is
  -- no longer one of the strongest compromise indicators -- the
  -- answer key is E-02/E-04/E-07, matching complete/route.ts.
  if v_strongest_evidence is not null then

    if 'E-02' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    if 'E-04' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    if 'E-07' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    v_theory_score :=
      v_theory_score +
      (v_strongest_correct * 50);

  end if;


  -- -------------------------------------------------------
  -- PHISHING EMAIL ANALYSIS
  -- Maximum: 150
  -- Scored by presence, not position -- mission_theories.
  -- attack_sequence holds whichever of these 7 part ids the
  -- player flagged, matching complete/route.ts's
  -- expectedPhishingParts check.
  -- -------------------------------------------------------

  if v_attack_sequence is not null then

    if 'sender_domain' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'external_warning' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'unexpected_attachment' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'unusual_time' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'urgent_language' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'verify_button' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;

    if 'fake_url' = any(v_attack_sequence) then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    v_sequence_score :=
      round(
        (
          v_correct_positions::numeric
          / 7
        ) * 150
      );

    v_theory_score :=
      v_theory_score +
      v_sequence_score;

  end if;


  if v_theory_score > 600 then
    v_theory_score := 600;
  end if;


  -- -------------------------------------------------------
  -- CONTAINMENT SCORE
  -- Maximum: 350
  -- Action ids match components/mission-one/MissionOneContainment.tsx
  -- and complete/route.ts's correctContainment/harmfulContainment.
  -- -------------------------------------------------------

  select actions
  into v_actions
  from public.mission_containment
  where player_id = p_player_id
    and mission_id = 1;


  if v_actions is not null then

    if 'maya_report_it' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'maya_change_password' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'maya_sign_out_sessions' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'maya_preserve_email' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'maya_delete_and_hide' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    if 'maya_wait' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    if 'maya_approve_mfa' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    if 'maya_reply_sender' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    -- Bonus for selecting all four correct actions
    -- without selecting a harmful action.

    if
      'maya_report_it' = any(v_actions)
      and 'maya_change_password' = any(v_actions)
      and 'maya_sign_out_sessions' = any(v_actions)
      and 'maya_preserve_email' = any(v_actions)

      and not (
        'maya_delete_and_hide' = any(v_actions)
        or 'maya_wait' = any(v_actions)
        or 'maya_approve_mfa' = any(v_actions)
        or 'maya_reply_sender' = any(v_actions)
      )
    then
      v_containment_score :=
        v_containment_score + 20;
    end if;

  end if;


  if v_containment_score < 0 then
    v_containment_score := 0;
  end if;

  if v_containment_score > 350 then
    v_containment_score := 350;
  end if;


  -- -------------------------------------------------------
  -- LIVE TOTAL
  -- Intel bonus is not included here (it is 0 in
  -- complete/route.ts too, pending the Investigator's Conclusion
  -- page). Real achievable maximum is 1450 (500+600+350), not the
  -- 1500 advertised on missions.max_score.
  -- -------------------------------------------------------

  v_total :=
    v_evidence_score +
    v_theory_score +
    v_containment_score;


  -- -------------------------------------------------------
  -- COMPLETED MISSION COUNT
  -- Do NOT treat a partial live score as a completed mission.
  -- -------------------------------------------------------

  select
    case
      when exists (
        select 1
        from public.mission_attempts
        where player_id = p_player_id
          and mission_id = 1
          and status = 'submitted'
      )
      then 1
      else 0
    end
  into v_completed;


  -- -------------------------------------------------------
  -- CREATE OR UPDATE LEADERBOARD ROW
  -- -------------------------------------------------------

  insert into public.leaderboard_entries (
    player_id,
    alias,
    mission_1_score,
    mission_2_score,
    mission_3_score,
    mission_4_score,
    total_score,
    completed_count,
    updated_at
  )
  values (
    p_player_id,
    coalesce(v_alias, 'Agent'),
    v_total,
    0,
    0,
    0,
    v_total,
    v_completed,
    now()
  )

  on conflict (player_id)
  do update set

    alias =
      excluded.alias,

    mission_1_score =
      excluded.mission_1_score,

    total_score =
      excluded.mission_1_score
      + coalesce(
          public.leaderboard_entries.mission_2_score,
          0
        )
      + coalesce(
          public.leaderboard_entries.mission_3_score,
          0
        )
      + coalesce(
          public.leaderboard_entries.mission_4_score,
          0
        ),

    completed_count =
      v_completed
      + case
          when coalesce(
            public.leaderboard_entries.mission_2_score,
            0
          ) > 0 then 1
          else 0
        end
      + case
          when coalesce(
            public.leaderboard_entries.mission_3_score,
            0
          ) > 0 then 1
          else 0
        end
      + case
          when coalesce(
            public.leaderboard_entries.mission_4_score,
            0
          ) > 0 then 1
          else 0
        end,

    updated_at = now();

end;
$recompute_mission_1_live_score$;
