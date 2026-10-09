import { describe, expect, it } from 'vitest';
import { routeForMissionOneStage } from '../src/lib/missions/mission-one';

describe('Mission 01 resume routing', () => {
  it('routes each saved stage correctly', () => {
    expect(routeForMissionOneStage('briefing')).toBe('/missions/1/play');
    expect(routeForMissionOneStage('incident')).toBe('/missions/1/play/incident');
    expect(routeForMissionOneStage('evidence')).toBe('/missions/1/play/evidence');
    expect(routeForMissionOneStage('theory')).toBe('/missions/1/play/theory');
    expect(routeForMissionOneStage('containment')).toBe('/missions/1/play/containment');
    expect(routeForMissionOneStage('report')).toBe('/missions/1/play/report');
  });
});
