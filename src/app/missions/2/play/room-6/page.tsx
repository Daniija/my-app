import MissionTwoRoomSix from '@/components/mission-two/MissionTwoRoomSix';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomSixPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(6);

  return (
    <MissionTwoRoomSix
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
