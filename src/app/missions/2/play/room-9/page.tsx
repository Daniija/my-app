import MissionTwoRoomNine from '@/components/mission-two/MissionTwoRoomNine';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomNinePage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(9);

  return (
    <MissionTwoRoomNine
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
