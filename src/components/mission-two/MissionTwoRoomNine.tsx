import MissionTwoRoomChallenge from '@/components/mission-two/MissionTwoRoomChallenge';
import { getMissionTwoRoom } from '@/lib/missions/mission-two-rooms';

type Props = {
  playerAlias: string;
  previewMode?: boolean;
};

export default function MissionTwoRoomNine({
  playerAlias,
  previewMode = false,
}: Props) {
  const config =
    getMissionTwoRoom(9);

  if (!config) {
    return null;
  }

  return (
    <MissionTwoRoomChallenge
      config={config}
      playerAlias={playerAlias}
      previewMode={previewMode}
    />
  );
}
