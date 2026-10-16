import MissionTwoRoomTen from '@/components/mission-two/MissionTwoRoomTen';
import { requireMissionTwoPlayerRoom } from '@/lib/missions/mission-two-room-page';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomTenPage() {
  const { profile } =
    await requireMissionTwoPlayerRoom(10);

  return (
    <MissionTwoRoomTen
      playerAlias={
        profile.alias ?? 'Agent'
      }
    />
  );
}
