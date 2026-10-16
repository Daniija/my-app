export const MISSION_TWO_FINAL_CODE =
  '4PRIVACY';

const CHARACTERS =
  MISSION_TWO_FINAL_CODE.split('');

/*
  Fixed admin-preview sequence.

  Admin preview never writes a player
  fragment assignment to the database.
*/
const PREVIEW_FRAGMENTS =
  'V4CPYIAR'.split('');

function createSeed(
  playerId: string
) {
  let seed = 0;

  for (
    let index = 0;
    index < playerId.length;
    index += 1
  ) {
    seed =
      (
        seed * 31 +
        playerId.charCodeAt(index)
      ) >>> 0;
  }

  return seed;
}

function createRandom(
  initialSeed: number
) {
  let seed =
    initialSeed >>> 0;

  return function random() {
    seed =
      (
        seed * 1664525 +
        1013904223
      ) >>> 0;

    return (
      seed /
      4294967296
    );
  };
}

export function getMissionTwoFragments(
  playerId: string
) {
  const fragments = [
    ...CHARACTERS,
  ];

  const random =
    createRandom(
      createSeed(playerId)
    );

  for (
    let index =
      fragments.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      Math.floor(
        random() *
          (index + 1)
      );

    [
      fragments[index],
      fragments[swapIndex],
    ] = [
      fragments[swapIndex],
      fragments[index],
    ];
  }

  /*
    Never let the player receive
    4PRIVACY already solved.
  */
  if (
    fragments.join('') ===
    MISSION_TWO_FINAL_CODE
  ) {
    [
      fragments[0],
      fragments[1],
    ] = [
      fragments[1],
      fragments[0],
    ];
  }

  return fragments;
}

export function getMissionTwoFragment(
  playerId: string,
  roomNumber: number
) {
  if (
    roomNumber < 1 ||
    roomNumber > 8
  ) {
    return null;
  }

  return (
    getMissionTwoFragments(
      playerId
    )[roomNumber - 1] ??
    null
  );
}

export function getMissionTwoPreviewFragment(
  roomNumber: number
) {
  if (
    roomNumber < 1 ||
    roomNumber > 8
  ) {
    return null;
  }

  return (
    PREVIEW_FRAGMENTS[
      roomNumber - 1
    ] ?? null
  );
}