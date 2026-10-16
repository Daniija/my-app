import {
  submitMissionTwoRoom,
} from '@/lib/missions/mission-two-room-submit';

export async function POST(
  request: Request
) {
  return submitMissionTwoRoom(
    request,
    7
  );
}
