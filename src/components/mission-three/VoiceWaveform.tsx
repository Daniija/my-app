'use client';

// Fixed, non-random bar heights -- deterministic so server and
// client render identically (no hydration mismatch), same reasoning
// as VerificationChecklist's fixed START_ORDER. Purely cosmetic: it
// pulses while `playing` is true and sits dim otherwise.
const BAR_HEIGHTS = [
  35, 60, 45, 80, 30, 55, 90, 40, 65, 50, 75, 55, 25, 85, 50, 60, 35, 70, 45,
  55,
];

export default function VoiceWaveform({ playing }: { playing: boolean }) {
  return (
    <div
      className="flex h-16 items-center justify-center gap-[3px] rounded-lg border border-red-900 bg-black/40 px-4"
      role="presentation"
      aria-hidden="true"
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className={`w-1 rounded-full transition-opacity ${
            playing ? 'animate-pulse bg-red-500' : 'bg-red-900/60'
          }`}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
