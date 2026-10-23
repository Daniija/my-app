'use client';

import { useEffect, useRef, useState } from 'react';

import StaticInterference from './StaticInterference';
import { useMissionThreeSubmit } from '@/lib/missions/use-mission-three-submit';

const HACKER_VIDEO_SRC = '/mission-3/evidence/hacker-trust-no-one.mp4';

// How long the "TRUST NO ONE. / VERIFY EVERYTHING." end card holds
// before automatically continuing into the first investigation
// stage, once the server has confirmed the transmission is complete.
const END_CARD_HOLD_MS = 1800;

// Anything within this many seconds of the video's own reported
// duration counts as "really finished." This is defense-in-depth
// only -- it raises the bar against a trivially fake `ended` event,
// it is NOT the real protection. The real protection is that
// /api/missions/3/transmission/complete only exists to flip
// current_stage from "transmission" to "voice" for this one attempt,
// awards zero points, and every later Mission 03 route independently
// refuses to load until current_stage has actually reached it.
const COMPLETION_TOLERANCE_SECONDS = 1.5;

const DIALOGUE_CUES: { start: number; end: number; text: string }[] = [
  { start: 0, end: 3, text: 'You still think you know who you can trust?' },
  { start: 3, end: 5.5, text: 'Seeing is no longer believing.' },
  { start: 5.5, end: 8, text: 'Hearing is no longer believing.' },
  {
    start: 8,
    end: 11,
    text: 'A face can be copied. A voice can be cloned.',
  },
  {
    start: 11,
    end: 13.5,
    text: 'So before you believe anything... verify everything.',
  },
  { start: 13.5, end: 17, text: 'Trust no one.' },
];

type Phase =
  | 'static'
  | 'playing'
  | 'gesture-required'
  | 'media-error'
  | 'ended';

// Owns the full unskippable sequence that runs immediately after the
// Mission 03 briefing countdown: full-screen static interference,
// then a locked-down hacker video takeover, then the twist end card,
// then (only once the server has confirmed completion) automatic
// navigation into the first real investigation stage.
//
// This component never advances current_stage itself -- it only
// calls /api/missions/3/transmission/complete once the video has
// genuinely ended, and only navigates onward once that call succeeds.
// Refreshing mid-sequence re-enters this same component from the top
// (the page wrapper re-checks current_stage server-side on every
// load), so there is no partial-progress state to bypass.
export default function HackerTransmission({
  previewMode,
}: {
  previewMode: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('static');
  const [subtitle, setSubtitle] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTimeRef = useRef(0);

  const { result, error, submit, continueToNext } = useMissionThreeSubmit({
    endpoint: '/api/missions/3/transmission/complete',
    previewMode,
    previewNextPath: '/admin/missions/3/preview/voice',
    nextPathFor: () => '/missions/3/play/voice',
  });

  // Attempt (or re-attempt) playback whenever we enter the "playing"
  // phase. If the browser blocks autoplay-with-sound, fall back to a
  // full-screen "click to receive transmission" gate -- not a skip
  // button, just a way to satisfy the browser's gesture requirement.
  useEffect(() => {
    if (phase !== 'playing') {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    const playAttempt = video.play();

    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {
        setPhase('gesture-required');
      });
    }
  }, [phase]);

  // Auto-continue once the server has confirmed the transmission is
  // complete, giving the end card a moment to land first.
  useEffect(() => {
    if (!result) {
      return;
    }

    const timer = window.setTimeout(() => {
      continueToNext();
    }, END_CARD_HOLD_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot continue once the completion result lands
  }, [result]);

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    lastTimeRef.current = video.currentTime;

    const cue = DIALOGUE_CUES.find(
      (candidate) =>
        video.currentTime >= candidate.start &&
        video.currentTime < candidate.end
    );

    setSubtitle(cue?.text ?? '');
  }

  function handleSeeking() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    // Snap back any seek attempt (dragging a progress bar isn't
    // normally possible with controls hidden, but this guards
    // against a seek triggered programmatically).
    if (Math.abs(video.currentTime - lastTimeRef.current) > 0.75) {
      video.currentTime = lastTimeRef.current;
    }
  }

  function handlePause() {
    const video = videoRef.current;

    if (!video || video.ended || phase !== 'playing') {
      return;
    }

    void video.play().catch(() => {});
  }

  function handleEnded() {
    const video = videoRef.current;

    if (
      video &&
      Number.isFinite(video.duration) &&
      video.currentTime < video.duration - COMPLETION_TOLERANCE_SECONDS
    ) {
      return;
    }

    setPhase('ended');
    void submit({});
  }

  function handleGestureStart() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video
      .play()
      .then(() => setPhase('playing'))
      .catch(() => setPhase('media-error'));
  }

  function handleRetry() {
    const video = videoRef.current;

    if (video) {
      video.currentTime = 0;
      lastTimeRef.current = 0;
      video.load();
    }

    setPhase('playing');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {previewMode && (
        <div className="absolute right-3 top-3 z-[60] rounded-md border border-amber-600 bg-black/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
          Admin Preview — Nothing Saved
        </div>
      )}

      {phase === 'static' && (
        <StaticInterference onDone={() => setPhase('playing')} />
      )}

      {phase !== 'static' && (
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onEnded={handleEnded}
            onError={() => setPhase('media-error')}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onPause={handlePause}
            onContextMenu={(event) => event.preventDefault()}
          >
            <source src={HACKER_VIDEO_SRC} type="video/mp4" />
          </video>

          {phase === 'playing' && subtitle && (
            <div className="absolute inset-x-0 bottom-10 flex justify-center px-6">
              <p className="max-w-3xl rounded-md bg-black/70 px-4 py-2 text-center text-sm font-bold text-red-200 sm:text-base">
                {subtitle}
              </p>
            </div>
          )}

          {phase === 'gesture-required' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Secure Transmission Ready
              </p>

              <button
                type="button"
                onClick={handleGestureStart}
                className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition hover:bg-red-400"
              >
                Click to Receive Transmission
              </button>
            </div>
          )}

          {phase === 'media-error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Transmission Error
              </p>

              <p className="max-w-md text-sm text-slate-400">
                The secure transmission could not be received. The signal
                may be corrupted or unavailable.
              </p>

              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition hover:bg-red-400"
              >
                Retry Transmission
              </button>
            </div>
          )}

          {phase === 'ended' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center">
              <p className="text-2xl font-black uppercase tracking-[0.2em] text-red-500 sm:text-4xl">
                Trust No One.
              </p>

              <p className="text-lg font-bold uppercase tracking-[0.2em] text-slate-300 sm:text-2xl">
                Verify Everything.
              </p>

              {error && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-bold text-red-400">{error}</p>

                  <button
                    type="button"
                    onClick={() => submit({})}
                    className="rounded-lg bg-red-500 px-5 py-2.5 font-black text-black transition hover:bg-red-400"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
