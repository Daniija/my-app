import {
  getMissionTwoLesson,
} from '@/lib/missions/mission-two-lessons';

type Props = {
  roomNumber: number;
  clue?: string | null;
};

export default function MissionTwoLesson({
  roomNumber,
  clue = null,
}: Props) {
  const lesson =
    getMissionTwoLesson(
      roomNumber
    );

  if (!lesson) {
    return null;
  }

  const awardsFragment =
    roomNumber >= 1 &&
    roomNumber <= 8;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cyan-900 bg-cyan-950/10 p-5 text-left">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
          Mission Lesson
        </p>

        <h3 className="mt-3 text-xl font-black text-white">
          {lesson.title}
        </h3>

        <p className="mt-3 leading-7 text-slate-300">
          {lesson.lesson}
        </p>
      </div>

      <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-5 text-left">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          Key Takeaway
        </p>

        <p className="mt-3 font-bold leading-7 text-white">
          {lesson.takeaway}
        </p>
      </div>

      {awardsFragment &&
        clue && (
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500 bg-[#020b11] p-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Encrypted Fragment Recovered
            </p>

            <div className="mt-6 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-cyan-400 bg-cyan-950/30 shadow-[0_0_35px_rgba(34,211,238,0.2)]">
                <span className="font-mono text-7xl font-black text-cyan-300">
                  {clue}
                </span>
              </div>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Fragment Successfully Recovered
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Keep this character.
              You will need all eight
              fragments to unlock the
              final escape code.
            </p>
          </div>
        )}
    </div>
  );
}