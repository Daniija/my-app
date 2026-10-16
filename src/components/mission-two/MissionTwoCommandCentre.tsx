'use client';



import Link from 'next/link';

import { useSearchParams } from 'next/navigation';



type Props = {
  playerAlias: string;
  currentStage: string;
  previewMode?: boolean;
  collectedFragments?: string[];
};



type Room = {

  number: number;

  title: string;

  subtitle: string;

  icon: string;

};



const rooms: Room[] = [

  {

    number: 1,

    title: 'The Social & Photo Trail',

    subtitle:

      'Investigate what Maya has revealed online.',

    icon: '📱',

  },

  {

    number: 2,

    title: 'The Username Trail',

    subtitle:

      'Follow Maya across the internet.',

    icon: '🔎',

  },

  {

    number: 3,

    title: 'The Password Vault',

    subtitle:

      'Discover how personal information weakens passwords.',

    icon: '🔐',

  },

  {

    number: 4,

    title: 'The Wi-Fi Trap',

    subtitle:

      'Make the safest connection decision.',

    icon: '📶',

  },

  {

    number: 5,

    title: 'Hidden Information',

    subtitle:

      'Find what the photograph reveals behind the scenes.',

    icon: '🖼️',

  },

  {

    number: 6,

    title: 'The Search Trail',

    subtitle:

      'Discover what a simple search can reveal.',

    icon: '🌐',

  },

  {

    number: 7,

    title: 'The Impostor',

    subtitle:

      'Recognise when public information is being used against Maya.',

    icon: '🎭',

  },

  {

    number: 8,

    title: 'Rebuild the Attack',

    subtitle:

      'Connect the clues and reconstruct the attacker’s research.',

    icon: '🧩',

  },

  {

    number: 9,

    title: 'Digital Cleanup',

    subtitle:

      'Help Maya reduce unnecessary online exposure.',

    icon: '🧹',

  },

  {

    number: 10,

    title: 'The Final Lock',

    subtitle:

      'Use everything you discovered to escape.',

    icon: '🚪',

  },

];



function stageNumber(

  stage: string

) {

  if (

    !stage.startsWith(

      'room-'

    )

  ) {

    return 0;

  }



  return (

    Number(

      stage.replace(

        'room-',

        ''

      )

    ) || 0

  );

}



export default function MissionTwoCommandCentre({
  playerAlias,
  currentStage,
  previewMode = false,
  collectedFragments = [],
}: Props) {

  // ==================================

  // ADMIN PREVIEW STAGE

  // ==================================



  const searchParams =

    useSearchParams();



  /*

   * LIVE PLAYER MODE

   * ----------------

   * Progress comes from:

   *

   * mission_attempts.current_stage

   *

   * ADMIN PREVIEW MODE

   * ------------------

   * Nothing is written to mission_attempts.

   *

   * Preview progression is instead carried

   * through the URL:

   *

   * ?stage=room-2

   * ?stage=room-3

   * etc.

   */



  const previewStage =

    previewMode

      ? searchParams.get(

          'stage'

        )

      : null;



  const effectiveStage =

    previewStage &&

    (

      previewStage ===

        'map' ||

      /^room-(10|[1-9])$/.test(

        previewStage

      )

    )

      ? previewStage

      : currentStage;



  const activeRoom =

    stageNumber(

      effectiveStage

    );



  /*

   * Examples:

   *

   * effectiveStage = map

   * roomsCleared = 0

   * Room 01 = AVAILABLE

   *

   * effectiveStage = room-2

   * roomsCleared = 1

   * Room 01 = CLEARED

   * Room 02 = AVAILABLE

   *

   * effectiveStage = room-3

   * roomsCleared = 2

   * Room 01 = CLEARED

   * Room 02 = CLEARED

   * Room 03 = AVAILABLE

   */



  const roomsCleared =

    activeRoom > 0

      ? Math.max(

          0,

          activeRoom - 1

        )

      : 0;



  // ==================================
  // COLLECTED ESCAPE-CODE FRAGMENTS
  // ==================================

  const previewFragments =
    'V4CPYIAR'.split('');

  const previewFragmentCount =
    Math.min(
      roomsCleared,
      8
    );

  const cluesFound =
    previewMode
      ? previewFragments.slice(
          0,
          previewFragmentCount
        )
      : collectedFragments.slice(
          0,
          8
        );



  // ==================================

  // ROUTING

  // ==================================



  const roomBasePath =

    previewMode

      ? '/admin/missions/2/preview'

      : '/missions/2/play';



  const exitPath =

    previewMode

      ? '/admin'

      : '/dashboard';



  // ==================================

  // CURRENT ROOM

  // ==================================



  const currentRoomNumber =

    activeRoom > 0

      ? activeRoom

      : 1;



  const currentRoom =

    rooms.find(

      (room) =>

        room.number ===

        currentRoomNumber

    ) ?? rooms[0];



  return (

    <main className="min-h-screen bg-[#02080d] text-white">



      {/* ==================================

          TOP COMMAND BAR

      ================================== */}



      <header className="border-b border-cyan-950 bg-[#07141d]">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">



          <div>

            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">

              Cyber Defence Unit

            </p>



            <p className="mt-1 text-sm text-slate-400">

              Secure Operations Network

            </p>

          </div>



          <div className="flex flex-wrap items-center gap-5">



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



            <Link

              href={

                exitPath

              }

              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-600"

            >

              {previewMode

                ? 'Exit Preview'

                : 'Mission Control'}

            </Link>



          </div>

        </div>

      </header>



      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">



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

                  You are previewing Mission 02 without

                  releasing it to players. Room progress,

                  clues and scores will not be saved.

                </p>



                {/* TEMPORARY TEST INDICATOR */}

                <p className="mt-3 font-mono text-xs font-bold text-amber-200">

                  Preview stage:{' '}

                  {effectiveStage}

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



        {/* ==================================

            MISSION TITLE

        ================================== */}



        <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">



          <div className="border-b border-cyan-950 bg-[#081822] px-6 py-6">



            <div className="flex flex-wrap items-start justify-between gap-5">



              <div>



                <div className="flex flex-wrap items-center gap-3">



                  <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">

                    Mission 02

                  </p>



                  {previewMode && (

                    <span className="rounded-full border border-amber-700 bg-amber-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">

                      Preview

                    </span>

                  )}



                </div>



                <h1 className="mt-2 text-4xl font-black sm:text-5xl">

                  THE DIGITAL FOOTPRINT

                </h1>



                <p className="mt-2 text-xl font-bold text-cyan-300">

                  Escape Room Command Centre

                </p>



              </div>



              <div className="grid grid-cols-2 gap-3">



                <StatusBox

                  label="Rooms Cleared"

                  value={`${roomsCleared} / 10`}

                />



                <StatusBox

                  label="Clues Found"

                  value={`${cluesFound.length} / 8`}

                />



              </div>

            </div>

          </div>



          {/* ==================================

              MISSION OBJECTIVE

          ================================== */}



          <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_.65fr] sm:p-8">



            <div>



              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">

                Investigation Objective

              </p>



              <h2 className="mt-3 text-2xl font-black">

                Follow Maya&apos;s digital trail.

              </h2>



              <p className="mt-4 max-w-3xl leading-7 text-slate-300">

                The attacker knew information that made the

                phishing message believable. Investigate

                Maya&apos;s online presence, uncover the exposed

                information and determine how those individual

                pieces became part of the attack.

              </p>



              <div className="mt-6 grid gap-3 sm:grid-cols-2">



                <Objective>

                  Solve each investigation room.

                </Objective>



                <Objective>

                  Collect hidden clue characters.

                </Objective>



                <Objective>

                  Reconstruct the attacker&apos;s research.

                </Objective>



                <Objective>

                  Unlock the final escape code.

                </Objective>



              </div>

            </div>



            {/* CLUE TERMINAL */}

            <aside className="rounded-2xl border border-cyan-900 bg-[#020b11] p-5">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                Clue Terminal
              </p>

              <h3 className="mt-2 text-lg font-black">
                Escape Code Fragments
              </h3>

              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">

                {Array.from({
                  length: 8,
                }).map(
                  (
                    _,
                    index
                  ) => {
                    const clue =
                      cluesFound[index];

                    const revealed =
                      typeof clue ===
                        'string' &&
                      clue.length > 0;

                    return (
                      <div
                        key={index}
                        className={`flex aspect-square items-center justify-center rounded-lg border font-mono text-lg font-black ${
                          revealed
                            ? 'border-emerald-600 bg-emerald-950/30 text-emerald-300'
                            : 'border-slate-700 bg-black/30 text-slate-600'
                        }`}
                      >
                        {revealed
                          ? clue
                          : '?'}
                      </div>
                    );
                  }
                )}

              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Eight encrypted fragments are hidden throughout Rooms 01–08.
                Recover all eight, then unscramble them to unlock the final code.
              </p>

              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-400">
                {cluesFound.length} / 8 fragments recovered
              </p>

              {previewMode && (

                <div className="mt-5 rounded-lg border border-amber-900/70 bg-amber-950/10 p-3">

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                    Preview Session
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Preview fragments are temporary and will not be stored.
                    Player progress, scores and leaderboard data are not changed.
                  </p>

                </div>

              )}

            </aside>

          </div>

        </section>



        {/* ==================================

            ROOM MAP

        ================================== */}



        <section className="mt-7">



          <div className="mb-5">



            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">

              Investigation Map

            </p>



            <h2 className="mt-1 text-2xl font-black">

              Escape Room Sequence

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Rooms unlock in sequence. Complete the current

              room to continue.

            </p>



          </div>



          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">



            {rooms.map(

              (room) => {



                // Room is CLEARED if it comes

                // before the active room.

                const completed =

                  room.number <=

                  roomsCleared;



                // On the initial map only

                // Room 01 is available.

                //

                // Afterwards the current

                // effective room is available.

                const available =

                  effectiveStage ===

                    'map'

                    ? room.number ===

                      1

                    : room.number ===

                      activeRoom;



                const locked =

                  !completed &&

                  !available;



                return (

                  <article

                    key={

                      room.number

                    }

                    className={`relative overflow-hidden rounded-2xl border ${

                      completed

                        ? 'border-emerald-800 bg-emerald-950/10'

                        : available

                          ? 'border-cyan-500 bg-cyan-950/20'

                          : 'border-slate-800 bg-[#050d13]'

                    }`}

                  >



                    {available && (

                      <div className="absolute inset-x-0 top-0 h-1 bg-cyan-400" />

                    )}



                    <div className="p-5">



                      <div className="flex items-start justify-between gap-3">



                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-black/30 text-2xl">

                          {

                            room.icon

                          }

                        </div>



                        <span

                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${

                            completed

                              ? 'border-emerald-700 text-emerald-300'

                              : available

                                ? 'border-cyan-600 text-cyan-300'

                                : 'border-slate-700 text-slate-500'

                          }`}

                        >

                          {completed

                            ? 'Cleared'

                            : available

                              ? 'Available'

                              : 'Locked'}

                        </span>



                      </div>



                      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">

                        Room{' '}

                        {String(

                          room.number

                        ).padStart(

                          2,

                          '0'

                        )}

                      </p>



                      <h3 className="mt-2 min-h-[3rem] text-lg font-black">

                        {

                          room.title

                        }

                      </h3>



                      <p className="mt-3 min-h-[4rem] text-sm leading-6 text-slate-400">

                        {

                          room.subtitle

                        }

                      </p>



                      <div className="mt-5">



                        {completed && (

                          <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 px-3 py-2 text-center text-sm font-bold text-emerald-300">

                            ✓ ROOM CLEARED

                          </div>

                        )}



                        {available && (

                          <Link

                            href={`${roomBasePath}/room-${room.number}`}

                            className="block rounded-lg bg-cyan-400 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-cyan-300"

                          >

                            {room.number ===

                            1

                              ? 'ENTER ROOM'

                              : 'CONTINUE'}

                          </Link>

                        )}



                        {locked && (

                          <div className="rounded-lg border border-slate-800 bg-black/20 px-3 py-2 text-center text-sm font-bold text-slate-600">

                            🔒 LOCKED

                          </div>

                        )}



                      </div>

                    </div>

                  </article>

                );

              }

            )}



          </div>

        </section>



        {/* ==================================

            CURRENT ASSIGNMENT

        ================================== */}



        <section className="mt-7 rounded-2xl border border-red-900/70 bg-[#10070a] p-6 sm:p-8">



          <div className="flex flex-wrap items-center justify-between gap-5">



            <div>



              <p className="text-xs font-black uppercase tracking-[0.23em] text-red-400">

                Current Assignment

              </p>



              <h2 className="mt-2 text-2xl font-black">

                Room{' '}

                {String(

                  currentRoom.number

                ).padStart(

                  2,

                  '0'

                )}{' '}

                —{' '}

                {

                  currentRoom.title

                }

              </h2>



              <p className="mt-3 max-w-2xl leading-7 text-slate-400">

                {

                  currentRoom.subtitle

                }

              </p>



            </div>



            <Link

              href={`${roomBasePath}/room-${currentRoom.number}`}

              className="rounded-lg bg-cyan-400 px-7 py-3 font-black text-black transition hover:bg-cyan-300"

            >

              {currentRoom.number ===

              1

                ? 'ENTER ROOM 01 →'

                : `CONTINUE TO ROOM ${String(

                    currentRoom.number

                  ).padStart(

                    2,

                    '0'

                  )} →`}

            </Link>



          </div>

        </section>



      </div>

    </main>

  );

}



function StatusBox({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="min-w-[130px] rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-center">



      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">

        {label}

      </p>



      <p className="mt-1 text-xl font-black text-cyan-300">

        {value}

      </p>



    </div>

  );

}



function Objective({

  children,

}: {

  children:

    React.ReactNode;

}) {

  return (

    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#020b11] p-4">



      <span className="font-black text-cyan-400">

        ✓

      </span>



      <p className="text-sm leading-6 text-slate-300">

        {children}

      </p>



    </div>

  );

}