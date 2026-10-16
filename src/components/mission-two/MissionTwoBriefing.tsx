'use client';



import Link from 'next/link';



import {

  useEffect,

  useRef,

  useState,

} from 'react';



import {

  useRouter,

} from 'next/navigation';



type Attempt = {

  id: string;

  status: string;

  current_stage:

    string | null;

  started_at:

    string | null;

  completed_at:

    string | null;

};



type MissionTwoBriefingProps = {

  initialAttempt:

    Attempt | null;



  playerAlias:

    string;



  previewMode?: boolean;

};



function getMissionStagePath(

  stage:

    string | null | undefined,

  previewMode:

    boolean

) {

  const base =

    previewMode

      ? '/admin/missions/2/preview'

      : '/missions/2/play';



  switch (stage) {

    case 'incident':

      return `${base}/incident`;



    case 'map':

      return previewMode

        ? `${base}/escape-room`

        : '/missions/2/play/escape-room';



    case 'room-1':

      return `${base}/room-1`;



    case 'room-2':

      return `${base}/room-2`;



    case 'room-3':

      return `${base}/room-3`;



    case 'room-4':

      return `${base}/room-4`;



    case 'room-5':

      return `${base}/room-5`;



    case 'room-6':

      return `${base}/room-6`;



    case 'room-7':

      return `${base}/room-7`;



    case 'room-8':

      return `${base}/room-8`;



    case 'room-9':

      return `${base}/room-9`;



    case 'room-10':

      return `${base}/room-10`;



    case 'report':

      return `${base}/report`;



    case 'briefing':

    default:

      return null;

  }

}



export default function MissionTwoBriefing({

  initialAttempt,

  playerAlias,

  previewMode = false,

}: MissionTwoBriefingProps) {

  const router =

    useRouter();



  const startRequested =

    useRef(false);



  const [

    attempt,

    setAttempt,

  ] =

    useState<Attempt | null>(

      initialAttempt

    );



  const [

    starting,

    setStarting,

  ] = useState(

    !initialAttempt

  );



  const [

    error,

    setError,

  ] =

    useState('');

  const MISSION_DURATION_SECONDS =
    10;

  const [
    secondsRemaining,
    setSecondsRemaining,
  ] = useState(
    MISSION_DURATION_SECONDS
  );




















  // ----------------------------------

  // START / RESUME MISSION

  // ----------------------------------



  useEffect(() => {

    // ==================================

    // ADMIN PREVIEW MODE

    //

    // Do NOT:

    // - call /api/missions/2/start

    // - create mission_attempts

    // - require Mission 02 to be open

    //

    // We still show the secure-channel

    // animation so the admin sees the

    // same experience as a player.

    // ==================================
    if (previewMode) {
      setStarting(
        true
      );

      setError('');

      const timer =
        window.setTimeout(
          () => {
            const previewAttempt: Attempt =
              {
                id:
                  'admin-preview',

                status:
                  'active',

                current_stage:
                  'briefing',

                started_at:
                  new Date()
                    .toISOString(),

                completed_at:
                  null,
              };

            setAttempt(
              previewAttempt
            );

            setStarting(
              false
            );
          },
          1200
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    }

    // ==================================
    // NORMAL PLAYER MODE

    // ==================================



    if (

      initialAttempt

    ) {

      setAttempt(

        initialAttempt

      );



      setStarting(

        false

      );



      const resumePath =

        getMissionStagePath(

          initialAttempt

            .current_stage,

          false

        );



      if (resumePath) {

        router.replace(

          resumePath

        );

      }



      return;

    }



    if (

      startRequested.current

    ) {

      return;

    }



    startRequested.current =

      true;



    async function startMission() {

      try {

        const response =

          await fetch(

            '/api/missions/2/start',

            {

              method:

                'POST',



              headers: {

                Accept:

                  'application/json',

              },



              cache:

                'no-store',

            }

          );



        const contentType =

          response.headers.get(

            'content-type'

          );



        let body:

          any = null;



        if (

          contentType?.includes(

            'application/json'

          )

        ) {

          body =

            await response.json();

        } else {

          const text =

            await response.text();



          console.error(

            '[MISSION 02] Start returned non-JSON:',

            {

              status:

                response.status,



              contentType,



              text,

            }

          );



          throw new Error(

            `Mission start failed with HTTP ${response.status}.`

          );

        }



        if (

          !response.ok

        ) {

          throw new Error(

            body?.message ??

              'Unable to start Mission 02.'

          );

        }



        if (

          !body?.attempt

        ) {

          throw new Error(

            'Mission attempt was not returned by the server.'

          );

        }



        const loadedAttempt =

          body.attempt as Attempt;



        setAttempt(

          loadedAttempt

        );



        setError('');



        const resumePath =

          getMissionStagePath(

            loadedAttempt

              .current_stage,

            false

          );



        if (resumePath) {

          router.replace(

            resumePath

          );

        }

      } catch (err) {

        console.error(

          '[MISSION 02] Start failed:',

          err

        );



        setError(

          err instanceof

            Error

            ? err.message

            : 'Mission startup failed.'

        );



        startRequested.current =

          false;

      } finally {

        setStarting(

          false

        );

      }

    }



    void startMission();

  }, [

    initialAttempt,

    previewMode,

    router,

  ]);



  // ----------------------------------
  // BRIEFING CONTINUE COUNTDOWN
  // ----------------------------------

  useEffect(() => {
    if (!attempt?.started_at) {
      setSecondsRemaining(
        MISSION_DURATION_SECONDS
      );
      return;
    }

    const startedAt =
      new Date(
        attempt.started_at
      ).getTime();

    function updateCountdown() {
      const elapsedSeconds =
        Math.floor(
          (Date.now() - startedAt) /
            1000
        );

      const remaining =
        Math.max(
          0,
          MISSION_DURATION_SECONDS -
            elapsedSeconds
        );

      setSecondsRemaining(
        remaining
      );
    }

    updateCountdown();

    const interval =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    attempt?.started_at,
  ]);

  const countdownMinutes =
    Math.floor(
      secondsRemaining / 60
    );

  const countdownSeconds =
    secondsRemaining % 60;

  const countdownDisplay =
    `${String(
      countdownMinutes
    ).padStart(
      2,
      '0'
    )}:${String(
      countdownSeconds
    ).padStart(
      2,
      '0'
    )}`;

  const countdownCritical =
    secondsRemaining <= 60;


  // ----------------------------------

  // CONTINUE

  // ----------------------------------



  function continueMission() {

    if (!attempt) {

      return;

    }



    if (previewMode) {

      router.push(

        '/admin/missions/2/preview/incident'

      );



      return;

    }



    router.push(

      '/missions/2/play/incident'

    );

  }



  function retryConnection() {

    startRequested.current =

      false;



    setError('');



    setStarting(

      true

    );



    window.location.reload();

  }



  // ==================================

  // ESTABLISHING CONNECTION

  // ==================================



  if (starting) {

    return (

      <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">



        <div className="mx-auto max-w-5xl">



          {previewMode && (

            <div className="mb-5 rounded-xl border border-amber-600/50 bg-amber-950/20 px-5 py-4">



              <div className="flex flex-wrap items-center justify-between gap-3">



                <div>



                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">

                    Admin Preview

                  </p>



                  <p className="mt-1 text-sm text-slate-400">

                    Mission status,

                    player progress and

                    scores will not be

                    changed.

                  </p>



                </div>



                <Link

                  href="/admin"

                  className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-950/40"

                >

                  Exit Preview

                </Link>



              </div>



            </div>

          )}



          <section className="rounded-2xl border border-cyan-900 bg-[#07141d] p-10 text-center">



            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">

              Cyber Defence Unit

            </p>



            <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500">



              <div className="h-10 w-10 animate-pulse rounded-full bg-cyan-400/20" />



            </div>



            <h1 className="mt-6 text-3xl font-black">

              Establishing Secure Channel

            </h1>



            <p className="mt-3 text-slate-400">

              Preparing Mission 02...

            </p>



            <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-400">

              Retrieving Digital

              Footprint Intelligence

            </p>



            {previewMode && (

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">

                Preview Session

              </p>

            )}



          </section>



        </div>



      </main>

    );

  }



  // ==================================

  // CONNECTION ERROR

  // ==================================



  if (

    error ||

    !attempt

  ) {

    return (

      <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">



        <div className="mx-auto max-w-4xl">



          <section className="rounded-2xl border border-red-900 bg-[#120809] p-8">



            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">

              Secure Channel Error

            </p>



            <h1 className="mt-3 text-3xl font-black">

              Mission connection failed

            </h1>



            <p className="mt-4 text-slate-400">

              {error ||

                'Mission attempt could not be loaded.'}

            </p>



            <button

              type="button"

              onClick={

                retryConnection

              }

              className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-bold text-black"

            >

              Retry Connection

            </button>



          </section>



        </div>



      </main>

    );

  }



  // ==================================

  // MISSION BRIEFING

  // ==================================



  return (

    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">



      <div className="mx-auto max-w-6xl">



        {/* ==================================

            ADMIN PREVIEW BANNER

        ================================== */}



        {previewMode && (

          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">



            <div className="flex flex-wrap items-center justify-between gap-4">



              <div>



                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">

                  Admin Preview Mode

                </p>



                <p className="mt-1 text-sm text-slate-300">

                  You are viewing Mission

                  02 without releasing it

                  to players. Progress,

                  attempts and scores will

                  not be saved.

                </p>



              </div>



              <Link

                href="/admin"

                className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"

              >

                Exit Preview

              </Link>



            </div>



          </div>

        )}



        {/* HEADER */}



        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#07141d] px-5 py-4">



          <div>



            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">

              Cyber Defence Unit

            </p>



            <p className="mt-1 text-sm text-slate-400">

              Secure Operations Network

            </p>



          </div>



          <div className="flex items-center gap-4">

            <div
              className={`rounded-lg border px-4 py-2 text-center ${
                countdownCritical
                  ? 'border-red-700 bg-red-950/30'
                  : 'border-cyan-900 bg-[#020b11]'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Time Remaining
              </p>

              <p
                className={`mt-1 font-mono text-xl font-black ${
                  countdownCritical
                    ? 'text-red-300'
                    : 'text-cyan-300'
                }`}
              >
                {countdownDisplay}
              </p>
            </div>

            <div className="text-right">

              <p className="text-xs uppercase tracking-widest text-slate-500">
                {previewMode
                  ? 'Administrator'
                  : 'Operative'}
              </p>

              <p className="font-bold">
                {playerAlias}
              </p>

            </div>

          </div>



        </header>



        <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">



          {/* MISSION TITLE */}



          <div className="border-b border-cyan-950 bg-[#081822] px-6 py-5">



            <div className="flex flex-wrap items-start justify-between gap-4">



              <div>



                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">

                  Priority Transmission

                </p>



                <h1 className="mt-3 text-4xl font-black">

                  Mission 02

                </h1>



                <h2 className="mt-1 text-2xl font-bold text-cyan-300">

                  THE DIGITAL FOOTPRINT

                </h2>

                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-900 bg-black/20 px-3 py-2">

                  <span className="text-sm">
                    ⏱
                  </span>

                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Mission Countdown
                  </span>

                  <span
                    className={`font-mono text-sm font-black ${
                      countdownCritical
                        ? 'text-red-300'
                        : 'text-cyan-300'
                    }`}
                  >
                    {countdownDisplay}
                  </span>

                </div>



              </div>



              {previewMode && (

                <div className="rounded-lg border border-amber-700 bg-amber-950/20 px-4 py-2 text-center">



                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">

                    Mode

                  </p>



                  <p className="mt-1 text-sm font-black text-amber-200">

                    PREVIEW

                  </p>



                </div>

              )}



            </div>



          </div>



          <div className="grid lg:grid-cols-[1.25fr_.75fr]">



            {/* BRIEFING */}



            <div className="p-6 sm:p-8">



              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">

                Security Operations Centre

              </p>



              <h3 className="mt-2 text-2xl font-black">

                Secure Mission Briefing

              </h3>



              <p className="mt-3 leading-7 text-slate-400">

                New intelligence from

                the Mission 01 breach

                has revealed another

                part of the attack.

                Review the briefing below.

              </p>



              {/* WRITTEN BRIEFING */}

              <div className="mt-8 rounded-2xl border border-cyan-900 bg-[#020b11] p-6">

                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                  Mission Briefing
                </p>

                <div className="mt-5 leading-7 text-slate-300">

                  <p>
                    Agent, the breach investigation has
                    uncovered a new problem.
                  </p>

                  <p className="mt-4">
                    We now understand how Maya&apos;s account
                    was targeted, but one question remains.
                  </p>

                  <p className="mt-4 font-bold text-white">
                    How did the attacker know enough about
                    Maya to make the attack believable?
                  </p>

                  <p className="mt-4">
                    The phishing message contained
                    information about her workplace,
                    project activity and other details
                    that appeared legitimate.
                  </p>

                  <p className="mt-4">
                    Our investigation indicates that much
                    of that information did not come from
                    inside the company network.
                  </p>

                  <p className="mt-4">
                    It was already online.
                  </p>

                  <p className="mt-4">
                    Photos. Profiles. Usernames.
                    Locations. Old accounts. Small pieces
                    of information Maya may never have
                    realised she was revealing.
                  </p>

                  <p className="mt-4">
                    Your assignment is to follow
                    Maya&apos;s digital trail, identify what
                    an attacker could discover, and
                    determine how those pieces were used
                    against her.
                  </p>

                  <p className="mt-4 font-bold text-cyan-300">
                    Follow the trail. Find the exposure.
                    Mission Two begins now.
                  </p>

                </div>

              </div>

            </div>

            {/* MISSION FILE */}



            <aside className="border-t border-cyan-950 bg-[#041018] p-6 lg:border-l lg:border-t-0 sm:p-8">



              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-400">

                Mission File

              </p>



              <dl className="mt-6 space-y-5">



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Investigation

                  </dt>



                  <dd className="mt-1 font-bold">

                    Digital Footprint

                    Exposure

                  </dd>



                </div>



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Subject

                  </dt>



                  <dd className="mt-1 font-bold">

                    Maya Bennett

                  </dd>



                </div>



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Previous Incident

                  </dt>



                  <dd className="mt-1 font-bold">

                    Mission 01 —

                    The Breach

                  </dd>



                </div>



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Investigation Type

                  </dt>



                  <dd className="mt-1 font-bold">

                    Online Exposure

                    Analysis

                  </dd>



                </div>



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Escape Rooms

                  </dt>



                  <dd className="mt-1 font-bold">

                    10

                  </dd>



                </div>



                <div>



                  <dt className="text-xs uppercase text-slate-500">

                    Maximum Score

                  </dt>



                  <dd className="mt-1 font-bold">

                    1,500

                  </dd>



                </div>



                {previewMode && (

                  <div>



                    <dt className="text-xs uppercase text-slate-500">

                      Preview Status

                    </dt>



                    <dd className="mt-1 font-bold text-amber-300">

                      No data will be saved

                    </dd>



                  </div>

                )}



              </dl>



            </aside>



          </div>



          {/* CONTINUE */}



          <div className="border-t border-cyan-950 bg-[#07141d] px-6 py-5">



            <div className="flex flex-wrap items-center justify-between gap-4">



              <div>



                <p className="text-sm text-slate-400">

                  {secondsRemaining > 0
                    ? `Review the briefing. Continue unlocks in ${secondsRemaining} second${secondsRemaining === 1 ? '' : 's'}.`
                    : '✓ Digital footprint investigation authorised.'}

                </p>



                {previewMode && (

                  <p className="mt-1 text-xs font-bold text-amber-400">

                    Preview progress will

                    not affect the live

                    mission.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={
                  secondsRemaining > 0
                }
                onClick={
                  continueMission
                }
                className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {secondsRemaining > 0
                  ? `Continue to Incident Summary (${countdownDisplay})`
                  : 'Continue to Incident Summary →'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}