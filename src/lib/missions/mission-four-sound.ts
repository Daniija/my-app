'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Optional sound system. No audio files exist yet -- every play()
// call silently no-ops if the underlying element fails to load
// (404, browser autoplay restriction, anything) so gameplay never
// depends on sound. Files are expected at /mission-4/audio/<key>.mp3
// and can be dropped in later without touching this file.
export type MissionFourSoundKey =
  | 'tick'
  | 'warning'
  | 'critical'
  | 'correct'
  | 'incorrect'
  | 'stage_complete'
  | 'final_countdown'
  | 'success'
  | 'failed';

const SOUND_KEYS: MissionFourSoundKey[] = [
  'tick',
  'warning',
  'critical',
  'correct',
  'incorrect',
  'stage_complete',
  'final_countdown',
  'success',
  'failed',
];

const MUTE_STORAGE_KEY = 'mission4-sound-muted';

function soundSrc(key: MissionFourSoundKey) {
  return `/mission-4/audio/${key}.mp3`;
}

export function useMissionFourSound() {
  const elementsRef = useRef<Partial<Record<MissionFourSoundKey, HTMLAudioElement>>>({});

  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    for (const key of SOUND_KEYS) {
      const el = new Audio();
      el.preload = 'none';
      el.src = soundSrc(key);
      elementsRef.current[key] = el;
    }

    return () => {
      for (const key of SOUND_KEYS) {
        elementsRef.current[key]?.pause();
      }
      elementsRef.current = {};
    };
  }, []);

  const play = useCallback(
    (key: MissionFourSoundKey) => {
      if (muted) return;

      try {
        const el = elementsRef.current[key];
        if (!el) return;

        el.currentTime = 0;
        void el.play().catch(() => {
          // Autoplay restrictions or a missing file -- gameplay never
          // depends on this succeeding.
        });
      } catch {
        // Never let a sound-effect failure affect gameplay.
      }
    },
    [muted]
  );

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch {
        // Per-viewer convenience only; ignore storage failures.
      }

      return next;
    });
  }, []);

  return { play, muted, toggleMuted };
}
