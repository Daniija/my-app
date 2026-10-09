export type MissionOneStage =
  | 'briefing'
  | 'incident'
  | 'evidence'
  | 'theory'
  | 'containment'
  | 'report'
  | null
  | undefined;

export function routeForMissionOneStage(
  stage: MissionOneStage
): string {
  switch (stage) {
    case 'incident':
      return '/missions/1/play/incident';

    case 'evidence':
      return '/missions/1/play/evidence';

    case 'theory':
      return '/missions/1/play/theory';

    case 'containment':
      return '/missions/1/play/containment';

    case 'report':
      return '/missions/1/play/report';

    case 'briefing':
    case null:
    case undefined:
    default:
      return '/missions/1/play';
  }
}