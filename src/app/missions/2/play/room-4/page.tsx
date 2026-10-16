import MissionTwoRoomFour from '@/components/mission-two/MissionTwoRoomFour';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomFourPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(4);

  return (
    <MissionTwoRoomFour
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
