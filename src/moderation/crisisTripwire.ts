const CRISIS_PHRASES: readonly string[] = [
  // English — explicit
  'kill myself',
  'killing myself',
  'want to die',
  'wanting to die',
  'end my life',
  'ending my life',
  'end it all',
  'no reason to live',
  'nothing to live for',
  'better off dead',
  'better off without me',
  'take my own life',
  'taking my own life',
  'commit suicide',
  'committing suicide',
  'suicidal',
  // English — metaphorical / code-switched
  'permanent solution to a temporary',
  'final goodbye',
  'saying goodbye forever',
  // Filipino — explicit
  'magpapakamatay',
  'magpapatiwakal',
  'ayoko na mabuhay',
  'ayaw ko na mabuhay',
  'wala nang silbi ang buhay',
  'walang silbi ang buhay',
  'tatapusin ko na ang',
  'tapusin ko na ang',
  'gusto ko nang mamatay',
  'hindi na ako mahalaga',
  'patayin ko na ang sarili',
  // Code-switched
  'mag-suicide na',
  'mag suicide na',
];

export function checkCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}
