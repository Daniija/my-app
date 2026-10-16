export type MissionTwoRoomConfig = {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  instructions: string;
  score: number;
  clue?: string;
  type:
  | 'multi'
  | 'single'
  | 'sequence'
  | 'matching'
  | 'worksheet'
  | 'final-code';
  options?: {
    id: string;
    title: string;
    detail: string;
    tag?: string;
  }[];
  matchRows?: {
    id: string;
    left: string;
  }[];
  matchChoices?: {
    id: string;
    label: string;
  }[];
};

export const missionTwoRooms: Record<
  number,
  MissionTwoRoomConfig
> = {
  // ==================================
  // ROOM 02 — THE USERNAME TRAIL
  // ==================================

  2: {
    number: 2,
    slug: 'room-2',

    title:
      'The Username Trail',

    subtitle:
      'One username can leave a trail across the internet.',

    instructions:
      `IDENTITY CORRELATION INVESTIGATION

The attacker searches for Maya’s known username:

@MayaB25

The search returns several accounts with similar usernames.

Not every account belongs to Maya.

Your task is to determine which THREE profiles are most likely connected to the same Maya Bennett you investigated in Room 01.

Do not rely on the username alone.

Compare:
• Usernames
• Locations
• Dates
• Personal details
• Travel information
• Workplace clues
• Repeated names or interests

Some profiles may share Maya’s username but belong to completely different people.

Other profiles may contain one or two similarities but still do not provide enough evidence to confidently connect them to Maya.

Select exactly THREE profiles that provide the strongest evidence of belonging to the same Maya Bennett.`,

    score: 125,

    clue: 'R',

    type: 'multi',

    options: [
      {
        id:
          'travel-profile',

        title:
          '@MayaB25 — Caribbean Travel Forum',

        detail:
          `PROFILE LOCATION:
Kingston, Jamaica

RECENT POST:
“Finally heading back to Montego Bay Oct 20–25 🌴. Five days cannot come soon enough!”

ACCOUNT CREATED:
2023`,

        tag:
          'PROFILE A',
      },

      {
        id:
          'pet-profile',

        title:
          '@MayaB25 — Pet Lovers Community',

        detail:
          `PROFILE LOCATION:
Kingston, Jamaica

RECENT POST:
“Buddy turned 4 today 🐾. Cannot believe my little troublemaker is already four!”

PROFILE PHOTO:
A small dog wearing a birthday bandana.`,

        tag:
          'PROFILE B',
      },

      {
        id:
          'recipe-profile',

        title:
          '@MayaB25 — Island Recipes',

        detail:
          `BIO:
“Finance girl. Food lover. Birthday: March 14 🎂”

LOCATION:
Kingston, Jamaica

RECENT ACTIVITY:
Saved several Montego Bay restaurant recommendations.`,

        tag:
          'PROFILE C',
      },

      {
        id:
          'maya25-photography',

        title:
          '@Maya25 — Jamaica Photography',

        detail:
          `BIO:
“Street photographer based in Spanish Town.”

RECENT POST:
“Another sunrise shoot before work.”

No references to Brightwell Group, Buddy, Montego Bay or March 14.`,

        tag:
          'PROFILE D',
      },

      {
        id:
          'mayab25-gaming',

        title:
          '@MayaB25 — Online Gaming Forum',

        detail:
          `PROFILE LOCATION:
Toronto, Canada

BIO:
“Student | Gamer | Cats”

RECENT POST:
“Twenty-first birthday next month!”

Most account activity is connected to Canadian gaming communities.`,

        tag:
          'PROFILE E',
      },

      {
        id:
          'mbennett-finance',

        title:
          '@MBennettFinance — Professional Discussion Board',

        detail:
          `PROFILE:
M. Bennett

LOCATION:
Kingston, Jamaica

RECENT COMMENT:
“Working in finance means month-end is always hectic.”

No photograph, employer, birthday, pet, travel information or connection to @MayaB25 is visible.`,

        tag:
          'PROFILE F',
      },
    ],
  },

  // ==================================
  // ROOM 03 — THE PASSWORD VAULT
  // ==================================

  3: {
    number: 3,
    slug: 'room-3',

    title:
      'The Password Vault',

    subtitle:
      'Can you build a password the attacker cannot predict?',

    instructions:
      `ATTACKER INTELLIGENCE

The attacker has already discovered the following information about Maya:

• Name: Maya Bennett
• Birthday: March 14
• Dog: Buddy
• Employer: Brightwell Group
• Project: Horizon
• Favourite destination: Montego Bay
• Username: MayaB25

Maya must create a NEW password for an account that has never been used before.

Several passwords below look complicated because they contain capital letters, numbers and symbols. However, a targeted attacker would not begin with random guesses — they would begin with information they already know about Maya.

Which password would be MOST resistant to a targeted password-guessing attack?`,

    score: 150,

    clue: 'I',

    type: 'single',

    options: [
      {
        id:
          'horizon',

        title:
          'Horizon@Brightwell26!',

        detail:
          'Long and complex-looking, but it combines Maya’s employer, current project and a predictable year.',

        tag:
          'CANDIDATE A',
      },

      {
        id:
          'buddy',

        title:
          'B!ddy-March14#',

        detail:
          'Uses substitutions and symbols, but it is still based on Maya’s pet name and birthday.',

        tag:
          'CANDIDATE B',
      },

      {
        id:
          'maya',

        title:
          'MayaB25$2026Secure',

        detail:
          'Contains several character types, but includes Maya’s public username and a predictable year.',

        tag:
          'CANDIDATE C',
      },

      {
        id:
          'random',

        title:
          'T7!qL9#vP2@xR8',

        detail:
          'A long password that is not constructed from any information found in Maya’s public digital footprint.',

        tag:
          'CANDIDATE D',
      },

      {
        id:
          'mobay',

        title:
          'MoBay20-25!Maya',

        detail:
          'Looks complex but combines Maya’s name with information from her publicly announced trip.',

        tag:
          'CANDIDATE E',
      },
    ],
  },

  // ==================================
  // ROOM 04 — THE WI-FI TRAP
  // ==================================

  4: {
    number: 4,
    slug: 'room-4',

    title:
      'The Wi-Fi Trap',

    subtitle:
      'A familiar network name does not mean the network can be trusted.',

    instructions:
      `INCIDENT SCENARIO

Maya is waiting at an airport and needs to send a confidential Project Horizon document to Brightwell Group.

Her laptop detects several possible connections:

A. Airport_Free_WiFi
• Open network
• No password required

B. Airport_Secure
• WPA2 protected
• Password is printed on signs throughout the terminal

C. Brightwell-Staff
• Strong signal
• Maya’s laptop recognizes the network name
• Maya is hundreds of kilometres away from the Brightwell office

D. Maya’s personal mobile hotspot
• WPA3 enabled
• Protected by a strong unique password

Maya also has access to the approved Brightwell-VPN.

Which action provides the BEST protection for the confidential document?

Remember: an attacker can create a fake Wi-Fi access point using a familiar network name.`,

    score: 125,

    clue: 'V',

    type: 'single',

    options: [
      {
        id:
          'free',

        title:
          'Use Airport_Free_WiFi',

        detail:
          'Connect to the open airport network because the document itself is password protected.',

        tag:
          'CONNECTION STRATEGY A',
      },

      {
        id:
          'airport-secure',

        title:
          'Use Airport_Secure',

        detail:
          'Connect because the network requires a password and therefore appears more secure than the open network.',

        tag:
          'CONNECTION STRATEGY B',
      },

      {
        id:
          'remembered',

        title:
          'Use Brightwell-Staff',

        detail:
          'Connect because Maya’s laptop recognizes the network name from work.',

        tag:
          'CONNECTION STRATEGY C',
      },

      {
        id:
          'hotspot-vpn',

        title:
          'Personal hotspot + Brightwell-VPN',

        detail:
          'Use Maya’s WPA3-protected personal hotspot and then establish the approved Brightwell-VPN before sending the document.',

        tag:
          'CONNECTION STRATEGY D',
      },

      {
        id:
          'free-vpn-late',

        title:
          'Airport_Free_WiFi, then activate the VPN later',

        detail:
          'Begin the upload using the free Wi-Fi and connect the VPN once the file transfer has started.',

        tag:
          'CONNECTION STRATEGY E',
      },
    ],
  },

  // ==================================
  // ROOM 05 — HIDDEN INFORMATION
  // ==================================

  5: {
    number: 5,
    slug: 'room-5',

    title:
      'Hidden Information',

    subtitle:
      'The photograph looks harmless. The file behind it does not.',

    instructions:
      `DIGITAL FORENSICS INVESTIGATION

Maya uploaded an original photograph.

At first glance, the image appears harmless. It contains no visible street signs, house numbers, names or recognizable landmarks.

However, digital image files can contain hidden metadata that reveals information the person who uploaded the image may never have intended to share.

Your task is to examine the extracted metadata and complete a forensic worksheet.

Recover ALL of the following:

• File name
• File type
• Original creation date
• Original creation time
• Device model
• Operating system / software
• GPS latitude
• GPS longitude
• Image width
• Image height
• Exposure time
• Orientation

Be careful.

The raw metadata contains several dates, technical values and similar-looking fields.

Every answer must be verified before the room will unlock.`,

    score: 125,

    clue: 'A',

    type:
      'worksheet',
  },

  // ==================================
  // ROOM 06 — THE SEARCH TRAIL
  // ==================================

  6: {
    number: 6,
    slug: 'room-6',

    title:
      'The Search Trail',

    subtitle:
      'Turn scattered public information into an attacker profile.',

    instructions:
      `OPEN-SOURCE INTELLIGENCE INVESTIGATION

An attacker wants to impersonate Maya’s supervisor and send her a convincing Project Horizon email.

A search produces the following public information.

RESULT A — BRIGHTWELL STAFF DIRECTORY
Maya Bennett
Finance Assistant
Finance Operations

RESULT B — BRIGHTWELL COMPANY POST
“Congratulations to the Project Horizon team, led by Finance Manager Andre Lewis.”

RESULT C — COMPANY CONTACT PAGE
Brightwell Group email format:
firstname.lastname@brightwellgroup.com

RESULT D — MAYAB25 SOCIAL POST
“Another late night working on Horizon. Andre is definitely keeping us busy 😂”

RESULT E — RESTAURANT REVIEW
“Maya recommends the jerk chicken at Island Grill.”

RESULT F — ORGANIZATIONAL CHART
Andre Lewis
Finance Manager
Finance Operations

RESULT G — TRAVEL POST
“Montego Bay Oct 20–25 🌴”

Your task is NOT to select everything that reveals personal information.

Select ONLY the evidence that would MOST DIRECTLY help the attacker impersonate Maya’s supervisor in a believable Project Horizon email.

Select ALL that apply.`,

    score: 150,

    clue: 'C',

    type: 'multi',

    options: [
      {
        id:
          'staff-directory',

        title:
          'Result A — Staff Directory',

        detail:
          'Confirms Maya’s employer, Finance Operations department and Finance Assistant role.',

        tag:
          'SEARCH RESULT A',
      },

      {
        id:
          'project-post',

        title:
          'Result B — Company Project Post',

        detail:
          'Links Project Horizon directly to Finance Manager Andre Lewis.',

        tag:
          'SEARCH RESULT B',
      },

      {
        id:
          'email-format',

        title:
          'Result C — Company Email Format',

        detail:
          'Reveals the structure Brightwell uses for employee email addresses.',

        tag:
          'SEARCH RESULT C',
      },

      {
        id:
          'maya-project-post',

        title:
          'Result D — Maya’s Horizon Post',

        detail:
          'Confirms that Maya works on Project Horizon and personally associates Andre with the project.',

        tag:
          'SEARCH RESULT D',
      },

      {
        id:
          'restaurant',

        title:
          'Result E — Restaurant Review',

        detail:
          'Reveals a food preference but does not materially strengthen a supervisor-based Project Horizon impersonation.',

        tag:
          'SEARCH RESULT E',
      },

      {
        id:
          'org-chart',

        title:
          'Result F — Organizational Chart',

        detail:
          'Confirms Andre Lewis’s management role and his connection to Maya’s department.',

        tag:
          'SEARCH RESULT F',
      },

      {
        id:
          'travel',

        title:
          'Result G — Vacation Post',

        detail:
          'Reveals Maya’s travel schedule but does not directly establish the supervisor, project or company identity needed for this pretext.',

        tag:
          'SEARCH RESULT G',
      },
    ],
  },

  // ==================================
  // ROOM 07 — THE IMPOSTOR
  // ==================================

  7: {
    number: 7,
    slug: 'room-7',

    title:
      'The Impostor',

    subtitle:
      'The attacker now knows enough to sound legitimate.',

    instructions:
      'A message arrives from “Daniel from IT” asking for Maya’s employee number because of a Project Horizon deadline. Choose the safest response.',

    score: 150,

    clue: 'Y',

    type: 'single',

    options: [
      {
        id:
          'reply',

        title:
          'Reply with the employee number',

        detail:
          'The message sounds urgent and knows the project name.',
      },

      {
        id:
          'ask-proof',

        title:
          'Ask the sender for proof',

        detail:
          'Continue the conversation and request more identifying details.',
      },

      {
        id:
          'official-channel',

        title:
          'Contact IT through the official company channel',

        detail:
          'Do not reply. Independently contact IT using the approved internal directory or help desk.',
      },

      {
        id:
          'forward-friend',

        title:
          'Forward it to a coworker',

        detail:
          'Ask a coworker whether the request looks real.',
      },
    ],
  },

  // ==================================
  // ROOM 08 — REBUILD THE ATTACK
  // ==================================

  8: {
    number: 8,
    slug: 'room-8',

    title:
      'Rebuild the Attack',

    subtitle:
      'Now reconstruct how small pieces became one convincing attack.',

    instructions:
      'Select the attack stages in the correct order. The cards are randomized every time the room loads.',

    score: 200,

    type: 'sequence',

    options: [
      {
        id:
          'social',

        title:
          'Public social profile',

        detail:
          'The attacker begins with information Maya openly shared.',
      },

      {
        id:
          'work',

        title:
          'Work information',

        detail:
          'Employer, department and project details are discovered.',
      },

      {
        id:
          'username',

        title:
          'Username search',

        detail:
          'The same username is searched across other sites.',
      },

      {
        id:
          'personal',

        title:
          'More personal details',

        detail:
          'Travel, pet and birthday clues are connected.',
      },

      {
        id:
          'profile',

        title:
          'Attacker builds profile',

        detail:
          'The separate pieces are combined into a believable picture.',
      },

      {
        id:
          'phish',

        title:
          'Convincing phishing message',

        detail:
          'The attacker uses the profile to make the message feel legitimate.',
      },
    ],
  },

  // ==================================
  // ROOM 09 — DIGITAL CLEANUP
  // ==================================

  9: {
    number: 9,
    slug: 'room-9',

    title:
      'Digital Cleanup',

    subtitle:
      'Finding the exposure is only useful if Maya reduces it.',

    instructions:
      'Match each exposure with the best cleanup action. The action choices are randomized.',

    score: 150,

    type: 'matching',

    matchRows: [
      {
        id:
          'public',

        left:
          'Public personal details',
      },

      {
        id:
          'old',

        left:
          'Old unused account',
      },

      {
        id:
          'photo',

        left:
          'Workplace photograph',
      },

      {
        id:
          'holiday',

        left:
          'Holiday dates',
      },

      {
        id:
          'username',

        left:
          'Same username everywhere',
      },
    ],

    matchChoices: [
      {
        id:
          'remove',

        label:
          'Remove unnecessary details',
      },

      {
        id:
          'delete',

        label:
          'Delete or secure the account',
      },

      {
        id:
          'review-photo',

        label:
          'Review or remove the photograph',
      },

      {
        id:
          'restrict',

        label:
          'Restrict audience and location sharing',
      },

      {
        id:
          'separate',

        label:
          'Consider separate usernames',
      },
    ],
  },

  // ==================================
  // ROOM 10 — FINAL LOCK
  // ==================================

  10: {
    number: 10,
    slug: 'room-10',

    title:
      'The Final Lock',

    subtitle:
      'Seven fragments. One final door.',

    instructions:
      'Unscramble the seven fragments recovered from Rooms 01–07 and enter the final word.',

    score: 125,

    type:
      'final-code',
  },
};

export function getMissionTwoRoom(
  number: number
) {
  return (
    missionTwoRooms[
      number
    ] ?? null
  );
}