import MissionTwoRoomSeven from '@/components/mission-two/MissionTwoRoomSeven';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomSevenPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(7);

  return (
    <MissionTwoRoomSeven
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
