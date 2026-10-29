'use client';

// Visible on/off control for the mission-four-sound.ts manager.
// Sound is never required for gameplay -- this is purely a
// convenience toggle, and keyboard/focus-visible styling comes from
// the shared .btn utility in globals.css.
export default function MissionFourSoundToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute sound' : 'Unmute sound'}
      className="btn btn-secondary px-3 py-2 text-xs"
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
