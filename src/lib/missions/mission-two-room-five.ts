import 'server-only';

export type MissionTwoRoomFiveField =
  | 'fileName'
  | 'fileType'
  | 'creationDate'
  | 'creationTime'
  | 'deviceModel'
  | 'software'
  | 'gpsLatitude'
  | 'gpsLongitude'
  | 'imageWidth'
  | 'imageHeight'
  | 'exposureTime'
  | 'orientation';

export type MissionTwoRoomFiveAnswers =
  Record<
    MissionTwoRoomFiveField,
    string
  >;

export type MissionTwoRoomFiveFieldResults =
  Record<
    MissionTwoRoomFiveField,
    boolean
  >;

export type MissionTwoRoomFiveValidation = {
  correct: boolean;
  verifiedCount: number;
  totalFields: number;
  fieldResults: MissionTwoRoomFiveFieldResults;
};

const FIELD_NAMES:
  MissionTwoRoomFiveField[] = [
    'fileName',
    'fileType',
    'creationDate',
    'creationTime',
    'deviceModel',
    'software',
    'gpsLatitude',
    'gpsLongitude',
    'imageWidth',
    'imageHeight',
    'exposureTime',
    'orientation',
  ];

function clean(
  value: unknown
) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function compact(
  value: unknown
) {
  return clean(value)
    .replace(
      /[^a-z0-9.-]/g,
      ''
    );
}

function matchesAny(
  value: unknown,
  accepted: string[]
) {
  const candidate =
    clean(value);

  return accepted.some(
    (answer) =>
      candidate ===
      clean(answer)
  );
}

function matchesCompact(
  value: unknown,
  accepted: string[]
) {
  const candidate =
    compact(value);

  return accepted.some(
    (answer) =>
      candidate ===
      compact(answer)
  );
}

function validateFileName(
  value: unknown
) {
  return matchesAny(
    value,
    [
      'IMG_4821.jpg',
      'img_4821.jpg',
    ]
  );
}

function validateFileType(
  value: unknown
) {
  return matchesAny(
    value,
    [
      'JPEG',
      'JPG',
      'JPEG Image',
      'image/jpeg',
    ]
  );
}

function validateCreationDate(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '2026-10-11',
      '2026/10/11',
      '11/10/2026',
      '11-10-2026',
      'October 11 2026',
      'October 11, 2026',
      'Oct 11 2026',
      'Oct 11, 2026',
    ]
  );
}

function validateCreationTime(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '06:47',
      '06:47:23',
      '6:47 AM',
      '6:47:23 AM',
      '06:47 AM',
      '06:47:23 AM',
    ]
  );
}

function validateDeviceModel(
  value: unknown
) {
  return matchesAny(
    value,
    [
      'iPhone 15',
      'Apple iPhone 15',
    ]
  );
}

function validateSoftware(
  value: unknown
) {
  return matchesAny(
    value,
    [
      'iOS 20.1',
      '20.1',
    ]
  );
}

function validateLatitude(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '18.0179',
      '18.0179 N',
      '18 deg 1 4.44 N',
      `18 deg 1' 4.44" N`,
    ]
  );
}

function validateLongitude(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '-76.8099',
      '76.8099 W',
      '76 deg 48 35.64 W',
      `76 deg 48' 35.64" W`,
    ]
  );
}

function validateImageWidth(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '4032',
      '4032 px',
      '4032 pixels',
    ]
  );
}

function validateImageHeight(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '3024',
      '3024 px',
      '3024 pixels',
    ]
  );
}

function validateExposureTime(
  value: unknown
) {
  return matchesCompact(
    value,
    [
      '1/250',
      '1/250 sec',
      '1/250 second',
      '0.004',
      '0.004 sec',
    ]
  );
}

function validateOrientation(
  value: unknown
) {
  return matchesAny(
    value,
    [
      'Horizontal (normal)',
      'Horizontal',
      'Normal',
      '1',
    ]
  );
}

export function validateMissionTwoRoomFive(
  value: unknown
): MissionTwoRoomFiveValidation {
  const answers =
    value &&
    typeof value ===
      'object' &&
    !Array.isArray(value)
      ? (
          value as Record<
            string,
            unknown
          >
        )
      : {};

  const fieldResults:
    MissionTwoRoomFiveFieldResults =
      {
        fileName:
          validateFileName(
            answers.fileName
          ),

        fileType:
          validateFileType(
            answers.fileType
          ),

        creationDate:
          validateCreationDate(
            answers.creationDate
          ),

        creationTime:
          validateCreationTime(
            answers.creationTime
          ),

        deviceModel:
          validateDeviceModel(
            answers.deviceModel
          ),

        software:
          validateSoftware(
            answers.software
          ),

        gpsLatitude:
          validateLatitude(
            answers.gpsLatitude
          ),

        gpsLongitude:
          validateLongitude(
            answers.gpsLongitude
          ),

        imageWidth:
          validateImageWidth(
            answers.imageWidth
          ),

        imageHeight:
          validateImageHeight(
            answers.imageHeight
          ),

        exposureTime:
          validateExposureTime(
            answers.exposureTime
          ),

        orientation:
          validateOrientation(
            answers.orientation
          ),
      };

  const verifiedCount =
    FIELD_NAMES.filter(
      (field) =>
        fieldResults[field]
    ).length;

  return {
    correct:
      verifiedCount ===
      FIELD_NAMES.length,

    verifiedCount,

    totalFields:
      FIELD_NAMES.length,

    fieldResults,
  };
}