import { requireAdmin } from '@/lib/admin';
import MissionTwoCommandCentre from '@/components/mission-two/MissionTwoCommandCentre';

export const dynamic =
  'force-dynamic';

type Props = {
  searchParams:
    Promise<{
      stage?: string;
    }>;
};

const allowedStages =
  new Set([
    'map',
    'room-1',
    'room-2',
    'room-3',
    'room-4',
    'room-5',
    'room-6',
    'room-7',
    'room-8',
    'room-9',
    'room-10',
  ]);

export default async function MissionTwoAdminPreviewEscapeRoomPage({
  searchParams,
}: Props) {
  const {
    profile,
  } = await requireAdmin();

  const params =
    await searchParams;

  const requestedStage =
    params.stage ?? 'map';

  const currentStage =
    allowedStages.has(
      requestedStage
    )
      ? requestedStage
      : 'map';

  return (
    <MissionTwoCommandCentre
      playerAlias={
        profile.alias ??
        'Administrator'
      }
      currentStage={
        currentStage
      }
      previewMode
    />
  );
}
