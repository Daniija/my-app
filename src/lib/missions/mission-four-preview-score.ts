import type { MissionFourStageName } from './mission-four-scoring';

// Admin preview mode never writes to the database -- but each
// Mission 04 preview stage is a separate full-page navigation with
// no shared attempt to read progress back from. This is purely a
// per-browser-tab convenience so the final admin preview report can
// show the score the admin actually earned by their real preview
// answers, instead of a fixed "what 100% looks like" sample. Mirrors
// mission-three-preview-score.ts exactly. Never read by real
// gameplay and never touches any server.
const STORAGE_KEY = 'mission4-admin-preview-scores';

function readAll(): Partial<Record<MissionFourStageName, number>> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordPreviewStageScore(stage: MissionFourStageName, points: number) {
  try {
    const current = readAll();
    current[stage] = points;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Preview-only convenience; a storage failure here should never
    // block the admin from continuing through the preview flow.
  }
}

export function getPreviewStageScores(): Partial<Record<MissionFourStageName, number>> {
  return readAll();
}

export function clearPreviewStageScores() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
