import MissionTwoRoomTwo from '@/components/mission-two/MissionTwoRoomTwo';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomTwoPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(2);

  return (
    <MissionTwoRoomTwo
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
