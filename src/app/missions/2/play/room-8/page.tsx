import MissionTwoRoomEight from '@/components/mission-two/MissionTwoRoomEight';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomEightPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(8);

  return (
    <MissionTwoRoomEight
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
