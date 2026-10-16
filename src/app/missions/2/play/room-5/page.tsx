import MissionTwoRoomFive from '@/components/mission-two/MissionTwoRoomFive';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomFivePage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(5);

  return (
    <MissionTwoRoomFive
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}