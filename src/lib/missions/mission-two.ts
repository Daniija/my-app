export type MissionTwoStage =
  | 'briefing'
  | 'incident'
  | 'map'
  | 'room-1'
  | 'room-2'
  | 'room-3'
  | 'room-4'
  | 'room-5'
  | 'room-6'
  | 'room-7'
  | 'room-8'
  | 'room-9'
  | 'room-10'
  | 'report'
  | null
  | undefined;

export function routeForMissionTwoStage(
  stage: MissionTwoStage
): string {
  switch (stage) {
    case 'incident':
      return '/missions/2/play/incident';

    case 'map':
      return '/missions/2/play/escape-room';

    case 'room-1':
      return '/missions/2/play/room-1';

    case 'room-2':
      return '/missions/2/play/room-2';

    case 'room-3':
      return '/missions/2/play/room-3';

    case 'room-4':
      return '/missions/2/play/room-4';

    case 'room-5':
      return '/missions/2/play/room-5';

    case 'room-6':
      return '/missions/2/play/room-6';

    case 'room-7':
      return '/missions/2/play/room-7';

    case 'room-8':
      return '/missions/2/play/room-8';

    case 'room-9':
      return '/missions/2/play/room-9';

    case 'room-10':
      return '/missions/2/play/room-10';

    case 'report':
      return '/missions/2/play/report';

    case 'briefing':
    case null:
    case undefined:
    default:
      return '/missions/2/play';
  }
}