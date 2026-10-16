import MissionTwoRoomThree from '@/components/mission-two/MissionTwoRoomThree';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomThreePage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(3);

  return (
    <MissionTwoRoomThree
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
