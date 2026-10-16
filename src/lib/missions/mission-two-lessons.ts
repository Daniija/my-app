export type MissionTwoLesson = {
  title: string;
  lesson: string;
  takeaway: string;
};

const lessons:
  Record<
    number,
    MissionTwoLesson
  > = {
  1: {
    title:
      'Your Posts Can Reveal More Than You Think',

    lesson:
      'Information shared in photographs and social media posts can reveal much more than expected. Workplace details, travel plans, names, locations and objects visible in photographs can all help an attacker build a profile of you.',

    takeaway:
      'Think before you post. Small pieces of public information can become powerful when combined.',
  },

  2: {
    title:
      'One Username Can Connect Multiple Accounts',

    lesson:
      'Reusing the same username across different websites can allow someone to connect accounts that were never intended to be linked together. Repeated locations, dates, interests and personal details make those connections even stronger.',

    takeaway:
      'A reused username can make your online activity much easier to trace across platforms.',
  },

  3: {
    title:
      'Complex Does Not Always Mean Secure',

    lesson:
      'A password can contain uppercase letters, numbers and symbols and still be predictable if it is based on information an attacker already knows. Names, birthdays, pets, workplaces, projects and travel information are common starting points for targeted password guessing.',

    takeaway:
      'Create long, unique passwords that are not based on information from your personal life or public digital footprint.',
  },

  4: {
    title:
      'A Familiar Wi-Fi Name Is Not Proof of Safety',

    lesson:
      'Attackers can create fake wireless networks that imitate legitimate hotspots. A network name that looks familiar does not guarantee that the connection is genuine or secure.',

    takeaway:
      'Use trusted connections for sensitive work and protect company traffic with the approved VPN.',
  },

  5: {
    title:
      'A Photograph Can Contain Hidden Information',

    lesson:
      'Image metadata can contain information that is invisible when simply looking at the photograph. It may reveal when the image was created, what device captured it and even the GPS coordinates where it was taken.',

    takeaway:
      'Review and remove unnecessary metadata before sharing photographs publicly.',
  },

  6: {
    title:
      'Public Information Can Support Impersonation',

    lesson:
      'Attackers do not always need to breach an organisation to learn about its staff. Employee profiles, company websites, project announcements, email formats and organisation charts can provide enough information to build a convincing impersonation.',

    takeaway:
      'Consider how separate pieces of public workplace information could be combined by an attacker.',
  },

  7: {
    title:
      'A Convincing Message Can Still Be Fake',

    lesson:
      'Attackers can use information gathered online to impersonate coworkers, supervisors and IT staff. Knowing real names, projects and workplace details can make a fraudulent message appear legitimate.',

    takeaway:
      'When a request seems suspicious, verify it independently through an official company communication channel.',
  },

  8: {
    title:
      'Targeted Attacks Are Built Piece by Piece',

    lesson:
      'A targeted phishing attack often develops gradually. The attacker begins with public information, follows connections across the internet, gathers additional personal and workplace details and then uses that information to create a believable attack.',

    takeaway:
      'Individual pieces of information may seem harmless, but together they can create a detailed profile that an attacker can exploit.',
  },

  9: {
    title:
      'Reducing Your Digital Footprint Reduces Risk',

    lesson:
      'Old accounts, public travel information, workplace photographs and unnecessary personal details can remain useful to attackers long after they were originally posted.',

    takeaway:
      'Regularly review your online presence and remove, restrict or secure information that no longer needs to be public.',
  },
};

export function getMissionTwoLesson(
  roomNumber: number
) {
  return (
    lessons[
      roomNumber
    ] ?? null
  );
}