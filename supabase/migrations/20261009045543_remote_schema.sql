drop extension if exists "pg_net";

alter table "public"."profiles" drop constraint "profiles_username_key";

alter table "public"."mission_attempts" drop constraint "mission_attempts_status_check";

drop index if exists "public"."profiles_username_key";


  create table "public"."mission_breach_reports" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid not null,
    "mission_id" bigint not null,
    "theory_score" integer not null default 0,
    "containment_score" integer not null default 0,
    "evidence_score" integer not null default 0,
    "bonus_score" integer not null default 0,
    "total_score" integer not null default 0,
    "submitted_at" timestamp with time zone not null default now()
      );


alter table "public"."mission_breach_reports" enable row level security;


  create table "public"."mission_containment" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid not null,
    "mission_id" bigint not null,
    "actions" text[] not null default '{}'::text[],
    "explanation" text not null default ''::text,
    "submitted_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."mission_containment" enable row level security;


  create table "public"."mission_evidence_reviews" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid not null,
    "mission_id" bigint not null,
    "evidence_id" text not null,
    "classification" text not null,
    "notes" text not null default ''::text,
    "reviewed_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."mission_evidence_reviews" enable row level security;


  create table "public"."mission_theories" (
    "id" uuid not null default gen_random_uuid(),
    "player_id" uuid not null,
    "mission_id" bigint not null,
    "attack_method" text not null,
    "initial_compromise" text not null,
    "strongest_evidence" text[] not null default '{}'::text[],
    "attack_sequence" text[] not null default '{}'::text[],
    "explanation" text not null default ''::text,
    "submitted_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."mission_theories" enable row level security;

alter table "public"."audit_logs" add column "actor_alias" text;

alter table "public"."audit_logs" add column "actor_role" text;

alter table "public"."audit_logs" add column "description" text;

alter table "public"."audit_logs" add column "metadata" jsonb not null default '{}'::jsonb;

alter table "public"."audit_logs" add column "target_id" text;

alter table "public"."audit_logs" add column "target_type" text;

alter table "public"."profiles" alter column "alias" drop not null;

alter table "public"."profiles" alter column "username" drop not null;

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs USING btree (actor_id);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);

CREATE UNIQUE INDEX mission_attempts_player_mission_unique ON public.mission_attempts USING btree (player_id, mission_id);

CREATE UNIQUE INDEX mission_breach_reports_pkey ON public.mission_breach_reports USING btree (id);

CREATE UNIQUE INDEX mission_breach_reports_player_id_mission_id_key ON public.mission_breach_reports USING btree (player_id, mission_id);

CREATE UNIQUE INDEX mission_containment_pkey ON public.mission_containment USING btree (id);

CREATE UNIQUE INDEX mission_containment_player_id_mission_id_key ON public.mission_containment USING btree (player_id, mission_id);

CREATE UNIQUE INDEX mission_evidence_reviews_pkey ON public.mission_evidence_reviews USING btree (id);

CREATE UNIQUE INDEX mission_evidence_reviews_player_id_mission_id_evidence_id_key ON public.mission_evidence_reviews USING btree (player_id, mission_id, evidence_id);

CREATE UNIQUE INDEX mission_theories_pkey ON public.mission_theories USING btree (id);

CREATE UNIQUE INDEX mission_theories_player_id_mission_id_key ON public.mission_theories USING btree (player_id, mission_id);

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);

alter table "public"."mission_breach_reports" add constraint "mission_breach_reports_pkey" PRIMARY KEY using index "mission_breach_reports_pkey";

alter table "public"."mission_containment" add constraint "mission_containment_pkey" PRIMARY KEY using index "mission_containment_pkey";

alter table "public"."mission_evidence_reviews" add constraint "mission_evidence_reviews_pkey" PRIMARY KEY using index "mission_evidence_reviews_pkey";

alter table "public"."mission_theories" add constraint "mission_theories_pkey" PRIMARY KEY using index "mission_theories_pkey";

alter table "public"."mission_breach_reports" add constraint "mission_breach_reports_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mission_breach_reports" validate constraint "mission_breach_reports_player_id_fkey";

alter table "public"."mission_breach_reports" add constraint "mission_breach_reports_player_id_mission_id_key" UNIQUE using index "mission_breach_reports_player_id_mission_id_key";

alter table "public"."mission_containment" add constraint "mission_containment_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mission_containment" validate constraint "mission_containment_player_id_fkey";

alter table "public"."mission_containment" add constraint "mission_containment_player_id_mission_id_key" UNIQUE using index "mission_containment_player_id_mission_id_key";

alter table "public"."mission_evidence_reviews" add constraint "mission_evidence_reviews_classification_check" CHECK ((classification = ANY (ARRAY['Relevant'::text, 'Suspicious'::text, 'Cleared'::text, 'Unsure'::text]))) not valid;

alter table "public"."mission_evidence_reviews" validate constraint "mission_evidence_reviews_classification_check";

alter table "public"."mission_evidence_reviews" add constraint "mission_evidence_reviews_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mission_evidence_reviews" validate constraint "mission_evidence_reviews_player_id_fkey";

alter table "public"."mission_evidence_reviews" add constraint "mission_evidence_reviews_player_id_mission_id_evidence_id_key" UNIQUE using index "mission_evidence_reviews_player_id_mission_id_evidence_id_key";

alter table "public"."mission_theories" add constraint "mission_theories_player_id_fkey" FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mission_theories" validate constraint "mission_theories_player_id_fkey";

alter table "public"."mission_theories" add constraint "mission_theories_player_id_mission_id_key" UNIQUE using index "mission_theories_player_id_mission_id_key";

alter table "public"."mission_attempts" add constraint "mission_attempts_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'started'::text, 'in_progress'::text, 'submitted'::text, 'completed'::text]))) not valid;

alter table "public"."mission_attempts" validate constraint "mission_attempts_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.live_score_from_containment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  perform public.recompute_mission_1_live_score(
    coalesce(
      new.player_id,
      old.player_id
    )
  );

  return coalesce(new, old);

end;
$function$
;

CREATE OR REPLACE FUNCTION public.live_score_from_evidence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  perform public.recompute_mission_1_live_score(
    coalesce(
      new.player_id,
      old.player_id
    )
  );

  return coalesce(new, old);

end;
$function$
;

CREATE OR REPLACE FUNCTION public.live_score_from_theory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  perform public.recompute_mission_1_live_score(
    coalesce(
      new.player_id,
      old.player_id
    )
  );

  return coalesce(new, old);

end;
$function$
;

CREATE OR REPLACE FUNCTION public.recompute_mission_1_live_score(p_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- 50 points per correct evidence classification
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
        and classification in ('Suspicious', 'Relevant')
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


  if v_strongest_evidence is not null then

    if 'E-02' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    if 'E-03' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    if 'E-04' = any(v_strongest_evidence) then
      v_strongest_correct :=
        v_strongest_correct + 1;
    end if;

    v_theory_score :=
      v_theory_score +
      (v_strongest_correct * 50);

  end if;


  -- -------------------------------------------------------
  -- ATTACK SEQUENCE
  -- Maximum: 150
  -- -------------------------------------------------------

  if v_attack_sequence is not null then

    if array_length(v_attack_sequence, 1) >= 1
      and v_attack_sequence[1] = 'phishing_email'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 2
      and v_attack_sequence[2] = 'fake_login'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 3
      and v_attack_sequence[3] = 'credentials_stolen'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 4
      and v_attack_sequence[4] = 'mfa_approved'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 5
      and v_attack_sequence[5] = 'attacker_login'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 6
      and v_attack_sequence[6] = 'restricted_access'
    then
      v_correct_positions :=
        v_correct_positions + 1;
    end if;


    if array_length(v_attack_sequence, 1) >= 7
      and v_attack_sequence[7] = 'external_share'
    then
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
  -- -------------------------------------------------------

  select actions
  into v_actions
  from public.mission_containment
  where player_id = p_player_id
    and mission_id = 1;


  if v_actions is not null then

    if 'revoke_sessions' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'reset_credentials' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'preserve_logs' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'disable_account' = any(v_actions) then
      v_containment_score :=
        v_containment_score + 90;
    end if;


    if 'delete_logs' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    if 'ignore' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    if 'shutdown_network' = any(v_actions) then
      v_containment_score :=
        v_containment_score - 70;
    end if;


    -- Bonus for selecting all four correct actions
    -- without selecting a harmful action.

    if
      'revoke_sessions' = any(v_actions)
      and 'reset_credentials' = any(v_actions)
      and 'preserve_logs' = any(v_actions)
      and 'disable_account' = any(v_actions)

      and not (
        'delete_logs' = any(v_actions)
        or 'ignore' = any(v_actions)
        or 'shutdown_network' = any(v_actions)
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
  -- Intel bonus is not included here.
  --
  -- Normal live maximum = 1450.
  -- Official completion can later replace this with 1500.
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
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_mission_1_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin

  update public.leaderboard_entries
  set
    mission_1_score = new.total_score,

    total_score =
      new.total_score
      + coalesce(mission_2_score, 0)
      + coalesce(mission_3_score, 0)
      + coalesce(mission_4_score, 0),

    completed_count =
      (case
        when new.total_score > 0
        then 1
        else 0
      end)
      +
      (case
        when coalesce(mission_2_score, 0) > 0
        then 1
        else 0
      end)
      +
      (case
        when coalesce(mission_3_score, 0) > 0
        then 1
        else 0
      end)
      +
      (case
        when coalesce(mission_4_score, 0) > 0
        then 1
        else 0
      end),

    updated_at = now()

  where player_id = new.player_id;

  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_agent_profile(p_alias text, p_department text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_alias text :=
    regexp_replace(trim(p_alias), '[[:space:]]+', ' ', 'g');
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_alias) < 3
     or char_length(v_alias) > 24 then
    raise exception 'INVALID_ALIAS';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(alias) = lower(v_alias)
      and id <> v_uid
  ) then
    raise exception 'ALIAS_TAKEN';
  end if;

  update public.profiles
  set
    alias = v_alias,
    department = nullif(trim(p_department), ''),
    onboarding_complete = true,
    updated_at = now()
  where id = v_uid
    and is_active = true;

  if not found then
    raise exception 'PROFILE_REQUIRED';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active = true);
$function$
;

CREATE OR REPLACE FUNCTION public.mission_is_available(p_mission_id integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1 from public.missions m
    where m.id=p_mission_id
      and m.status <> 'emergency_locked'
      and m.status <> 'closed'
      and (m.status in ('live','forced_open') or (m.status='scheduled' and now() >= m.unlock_at))
      and (m.close_at is null or now() < m.close_at)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_bonus_code(p_code text)
 RETURNS TABLE(points integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_code public.bonus_codes%rowtype; v_score public.mission_scores%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_code from public.bonus_codes where upper(code)=upper(trim(p_code)) and active=true;
  if not found then raise exception 'INVALID_CODE'; end if;
  insert into public.bonus_redemptions(player_id,bonus_code_id,points) values(v_uid,v_code.id,v_code.points) on conflict(player_id,bonus_code_id) do nothing;
  if not found then return query select 0,'Code already redeemed'::text; return; end if;

  select * into v_score from public.mission_scores where player_id=v_uid and mission_id=v_code.mission_id for update;
  if found then
    update public.mission_scores set bonus_score=least(50,bonus_score+v_code.points),total_score=least((select max_score from public.missions where id=v_code.mission_id),base_score+least(50,bonus_score+v_code.points)),
      breakdown=jsonb_set(breakdown,'{bonus}',to_jsonb(least(50,bonus_score+v_code.points)),true),updated_at=now() where id=v_score.id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(v_uid,'bonus_redeemed','bonus_code',v_code.id::text,jsonb_build_object('points',v_code.points));
  return query select v_code.points,'Intelligence verified'::text;
end; $function$
;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_for_player(p_player uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_alias text;
begin
  select alias into v_alias from public.profiles where id=p_player;
  insert into public.leaderboard_entries(player_id,alias,mission_1_score,mission_2_score,mission_3_score,mission_4_score,total_score,completed_count,updated_at)
  select p_player, v_alias,
    coalesce(max(total_score) filter(where mission_id=1),0),
    coalesce(max(total_score) filter(where mission_id=2),0),
    coalesce(max(total_score) filter(where mission_id=3),0),
    coalesce(max(total_score) filter(where mission_id=4),0),
    coalesce(sum(total_score),0),
    count(*)::int,
    now()
  from public.mission_scores where player_id=p_player
  on conflict(player_id) do update set
    alias=excluded.alias,
    mission_1_score=excluded.mission_1_score,
    mission_2_score=excluded.mission_2_score,
    mission_3_score=excluded.mission_3_score,
    mission_4_score=excluded.mission_4_score,
    total_score=excluded.total_score,
    completed_count=excluded.completed_count,
    updated_at=now();
end; $function$
;

CREATE OR REPLACE FUNCTION public.score_changed_refresh_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin perform public.refresh_leaderboard_for_player(coalesce(new.player_id,old.player_id)); return coalesce(new,old); end; $function$
;

CREATE OR REPLACE FUNCTION public.start_mission(p_mission_id integer)
 RETURNS TABLE(id uuid, player_id uuid, mission_id integer, status text, current_stage text, started_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where profiles.id=v_uid and is_active=true) then raise exception 'PROFILE_REQUIRED'; end if;
  if not public.mission_is_available(p_mission_id) then
    if exists(select 1 from public.mission_attempts a where a.player_id=v_uid and a.mission_id=p_mission_id and a.status in ('active','completed')) then
      -- Existing attempts remain retrievable, including completed attempts.
      null;
    else
      raise exception 'MISSION_LOCKED';
    end if;
  end if;

  insert into public.mission_attempts(player_id,mission_id)
  values(v_uid,p_mission_id)
  on conflict(player_id,mission_id) do nothing;

  return query select a.id,a.player_id,a.mission_id,a.status,a.current_stage,a.started_at,a.completed_at
    from public.mission_attempts a where a.player_id=v_uid and a.mission_id=p_mission_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.submit_week1_attempt(p_attempt_id uuid, p_submission jsonb)
 RETURNS TABLE(total_score integer, breakdown jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_existing public.mission_scores%rowtype;
  v_attack integer := 0;
  v_entry integer := 0;
  v_sequence integer := 0;
  v_evidence integer := 0;
  v_reasoning integer := 0;
  v_containment integer := 0;
  v_efficiency integer := 0;
  v_bonus integer := 0;
  v_base integer := 0;
  v_total integer := 0;
  v_accuracy integer := 0;
  v_elapsed_seconds numeric;
  v_hints integer := greatest(0, least(3, coalesce((p_submission->>'hints')::integer,0)));
  v_count integer;
  v_bad integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_attempt from public.mission_attempts where id=p_attempt_id for update;
  if not found or v_attempt.player_id<>v_uid or v_attempt.mission_id<>1 then raise exception 'INVALID_ATTEMPT'; end if;

  select * into v_existing from public.mission_scores where attempt_id=p_attempt_id;
  if found then return query select v_existing.total_score,v_existing.breakdown; return; end if;

  if p_submission->>'attackMethod'='phishing' then v_attack:=300; end if;
  if p_submission->>'entryPoint'='fake_login_page' then v_entry:=250; end if;
  if p_submission->'sequence'='["email","link","credentials","mfa","account_access"]'::jsonb then v_sequence:=200; end if;

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'strongest','[]'::jsonb)) x where x.value in ('E02','E03','E04');
  v_evidence := least(300,v_count*100);

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'reasoning','[]'::jsonb)) x where x.value in ('mfa_after_link','new_device_after_mfa');
  v_reasoning := least(100,v_count*50);

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'containment','[]'::jsonb)) x where x.value in ('revoke_sessions','reset_credentials','preserve_logs','disable_account');
  select count(*) into v_bad from jsonb_array_elements_text(coalesce(p_submission->'containment','[]'::jsonb)) x where x.value in ('accuse_maya','wait');
  v_containment := greatest(0,least(200,(v_count*50)-(v_bad*50)));

  v_elapsed_seconds := extract(epoch from (now()-v_attempt.started_at));
  v_efficiency := case when v_elapsed_seconds < 720 then 100 when v_elapsed_seconds < 900 then 75 when v_elapsed_seconds < 1080 then 50 when v_elapsed_seconds < 1200 then 25 else 0 end;
  -- Hint penalties: 25, 25, then 50 points, capped at the available efficiency bonus.
  v_efficiency := greatest(0,v_efficiency - case v_hints when 1 then 25 when 2 then 50 when 3 then 100 else 0 end);

  select coalesce(sum(br.points),0)::int into v_bonus
  from public.bonus_redemptions br where br.player_id=v_uid and br.bonus_code_id in (select id from public.bonus_codes where mission_id=1);

  v_base := v_attack+v_entry+v_sequence+v_evidence+v_reasoning+v_containment+v_efficiency;
  v_total := least(1500,v_base+v_bonus);
  v_accuracy := v_attack+v_entry+v_sequence+v_evidence+v_reasoning+v_containment;

  insert into public.mission_scores(attempt_id,player_id,mission_id,breakdown,base_score,bonus_score,total_score,accuracy_points)
  values(p_attempt_id,v_uid,1,jsonb_build_object(
    'attack_method',v_attack,'entry_point',v_entry,'sequence',v_sequence,'evidence',v_evidence,
    'reasoning',v_reasoning,'containment',v_containment,'efficiency',v_efficiency,'bonus',v_bonus
  ),v_base,v_bonus,v_total,v_accuracy);

  update public.mission_attempts set status='completed',current_stage='result',completed_at=now(),hints_used=v_hints,last_saved_at=now() where id=p_attempt_id;
  update public.mission_progress set progress=jsonb_set(coalesce(progress,'{}'::jsonb),'{stage}','"result"'::jsonb,true),updated_at=now() where attempt_id=p_attempt_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(v_uid,'mission_submitted','mission_attempt',p_attempt_id::text,jsonb_build_object('mission_id',1,'score',v_total));

  return query select v_total,jsonb_build_object(
    'attack_method',v_attack,'entry_point',v_entry,'sequence',v_sequence,'evidence',v_evidence,
    'reasoning',v_reasoning,'containment',v_containment,'efficiency',v_efficiency,'bonus',v_bonus
  );
end; $function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.onboarding_complete = true
     and new.alias is not null then

    insert into public.leaderboard_entries (
      player_id,
      alias
    )
    values (
      new.id,
      new.alias
    )
    on conflict (player_id)
    do update set
      alias = excluded.alias,
      updated_at = now();

  else
    delete from public.leaderboard_entries
    where player_id = new.id;
  end if;

  return new;
end;
$function$
;

grant insert on table "public"."mission_attempts" to "authenticated";

grant update on table "public"."mission_attempts" to "authenticated";

grant delete on table "public"."mission_breach_reports" to "anon";

grant insert on table "public"."mission_breach_reports" to "anon";

grant references on table "public"."mission_breach_reports" to "anon";

grant select on table "public"."mission_breach_reports" to "anon";

grant trigger on table "public"."mission_breach_reports" to "anon";

grant truncate on table "public"."mission_breach_reports" to "anon";

grant update on table "public"."mission_breach_reports" to "anon";

grant delete on table "public"."mission_breach_reports" to "authenticated";

grant insert on table "public"."mission_breach_reports" to "authenticated";

grant references on table "public"."mission_breach_reports" to "authenticated";

grant select on table "public"."mission_breach_reports" to "authenticated";

grant trigger on table "public"."mission_breach_reports" to "authenticated";

grant truncate on table "public"."mission_breach_reports" to "authenticated";

grant update on table "public"."mission_breach_reports" to "authenticated";

grant delete on table "public"."mission_breach_reports" to "service_role";

grant insert on table "public"."mission_breach_reports" to "service_role";

grant references on table "public"."mission_breach_reports" to "service_role";

grant select on table "public"."mission_breach_reports" to "service_role";

grant trigger on table "public"."mission_breach_reports" to "service_role";

grant truncate on table "public"."mission_breach_reports" to "service_role";

grant update on table "public"."mission_breach_reports" to "service_role";

grant delete on table "public"."mission_containment" to "anon";

grant insert on table "public"."mission_containment" to "anon";

grant references on table "public"."mission_containment" to "anon";

grant select on table "public"."mission_containment" to "anon";

grant trigger on table "public"."mission_containment" to "anon";

grant truncate on table "public"."mission_containment" to "anon";

grant update on table "public"."mission_containment" to "anon";

grant delete on table "public"."mission_containment" to "authenticated";

grant insert on table "public"."mission_containment" to "authenticated";

grant references on table "public"."mission_containment" to "authenticated";

grant select on table "public"."mission_containment" to "authenticated";

grant trigger on table "public"."mission_containment" to "authenticated";

grant truncate on table "public"."mission_containment" to "authenticated";

grant update on table "public"."mission_containment" to "authenticated";

grant delete on table "public"."mission_containment" to "service_role";

grant insert on table "public"."mission_containment" to "service_role";

grant references on table "public"."mission_containment" to "service_role";

grant select on table "public"."mission_containment" to "service_role";

grant trigger on table "public"."mission_containment" to "service_role";

grant truncate on table "public"."mission_containment" to "service_role";

grant update on table "public"."mission_containment" to "service_role";

grant delete on table "public"."mission_evidence_reviews" to "anon";

grant insert on table "public"."mission_evidence_reviews" to "anon";

grant references on table "public"."mission_evidence_reviews" to "anon";

grant select on table "public"."mission_evidence_reviews" to "anon";

grant trigger on table "public"."mission_evidence_reviews" to "anon";

grant truncate on table "public"."mission_evidence_reviews" to "anon";

grant update on table "public"."mission_evidence_reviews" to "anon";

grant delete on table "public"."mission_evidence_reviews" to "authenticated";

grant insert on table "public"."mission_evidence_reviews" to "authenticated";

grant references on table "public"."mission_evidence_reviews" to "authenticated";

grant select on table "public"."mission_evidence_reviews" to "authenticated";

grant trigger on table "public"."mission_evidence_reviews" to "authenticated";

grant truncate on table "public"."mission_evidence_reviews" to "authenticated";

grant update on table "public"."mission_evidence_reviews" to "authenticated";

grant delete on table "public"."mission_evidence_reviews" to "service_role";

grant insert on table "public"."mission_evidence_reviews" to "service_role";

grant references on table "public"."mission_evidence_reviews" to "service_role";

grant select on table "public"."mission_evidence_reviews" to "service_role";

grant trigger on table "public"."mission_evidence_reviews" to "service_role";

grant truncate on table "public"."mission_evidence_reviews" to "service_role";

grant update on table "public"."mission_evidence_reviews" to "service_role";

grant delete on table "public"."mission_theories" to "anon";

grant insert on table "public"."mission_theories" to "anon";

grant references on table "public"."mission_theories" to "anon";

grant select on table "public"."mission_theories" to "anon";

grant trigger on table "public"."mission_theories" to "anon";

grant truncate on table "public"."mission_theories" to "anon";

grant update on table "public"."mission_theories" to "anon";

grant delete on table "public"."mission_theories" to "authenticated";

grant insert on table "public"."mission_theories" to "authenticated";

grant references on table "public"."mission_theories" to "authenticated";

grant select on table "public"."mission_theories" to "authenticated";

grant trigger on table "public"."mission_theories" to "authenticated";

grant truncate on table "public"."mission_theories" to "authenticated";

grant update on table "public"."mission_theories" to "authenticated";

grant delete on table "public"."mission_theories" to "service_role";

grant insert on table "public"."mission_theories" to "service_role";

grant references on table "public"."mission_theories" to "service_role";

grant select on table "public"."mission_theories" to "service_role";

grant trigger on table "public"."mission_theories" to "service_role";

grant truncate on table "public"."mission_theories" to "service_role";

grant update on table "public"."mission_theories" to "service_role";


  create policy "Players can create own mission attempts"
  on "public"."mission_attempts"
  as permissive
  for insert
  to authenticated
with check ((player_id = auth.uid()));



  create policy "Players can read own mission attempts"
  on "public"."mission_attempts"
  as permissive
  for select
  to authenticated
using ((player_id = auth.uid()));



  create policy "Players can update own mission attempts"
  on "public"."mission_attempts"
  as permissive
  for update
  to authenticated
using ((player_id = auth.uid()))
with check ((player_id = auth.uid()));



  create policy "Players can read own breach report"
  on "public"."mission_breach_reports"
  as permissive
  for select
  to authenticated
using ((player_id = auth.uid()));



  create policy "Players can create own containment"
  on "public"."mission_containment"
  as permissive
  for insert
  to authenticated
with check ((player_id = auth.uid()));



  create policy "Players can read own containment"
  on "public"."mission_containment"
  as permissive
  for select
  to authenticated
using ((player_id = auth.uid()));



  create policy "Players can update own containment"
  on "public"."mission_containment"
  as permissive
  for update
  to authenticated
using ((player_id = auth.uid()))
with check ((player_id = auth.uid()));



  create policy "Players can create own evidence reviews"
  on "public"."mission_evidence_reviews"
  as permissive
  for insert
  to authenticated
with check ((player_id = auth.uid()));



  create policy "Players can read own evidence reviews"
  on "public"."mission_evidence_reviews"
  as permissive
  for select
  to authenticated
using ((player_id = auth.uid()));



  create policy "Players can update own evidence reviews"
  on "public"."mission_evidence_reviews"
  as permissive
  for update
  to authenticated
using ((player_id = auth.uid()))
with check ((player_id = auth.uid()));



  create policy "Players can create own theory"
  on "public"."mission_theories"
  as permissive
  for insert
  to authenticated
with check ((player_id = auth.uid()));



  create policy "Players can read own theory"
  on "public"."mission_theories"
  as permissive
  for select
  to authenticated
using ((player_id = auth.uid()));



  create policy "Players can update own theory"
  on "public"."mission_theories"
  as permissive
  for update
  to authenticated
using ((player_id = auth.uid()))
with check ((player_id = auth.uid()));


CREATE TRIGGER sync_mission_1_leaderboard_trigger AFTER INSERT OR UPDATE ON public.mission_breach_reports FOR EACH ROW WHEN ((new.mission_id = 1)) EXECUTE FUNCTION public.sync_mission_1_leaderboard();

CREATE TRIGGER mission_1_live_containment AFTER INSERT OR DELETE OR UPDATE ON public.mission_containment FOR EACH ROW EXECUTE FUNCTION public.live_score_from_containment();

CREATE TRIGGER mission_1_live_evidence AFTER INSERT OR DELETE OR UPDATE ON public.mission_evidence_reviews FOR EACH ROW EXECUTE FUNCTION public.live_score_from_evidence();

CREATE TRIGGER mission_1_live_theory AFTER INSERT OR DELETE OR UPDATE ON public.mission_theories FOR EACH ROW EXECUTE FUNCTION public.live_score_from_theory();


