// Literal, verified filenames; Vite includes the files as build-time URLs.
const files = import.meta.glob<string>('../assets/scenes/*', { eager: true, query: '?url', import: 'default' });
const url = (name: string): string => {
  const found = files[`../assets/scenes/${name}`];
  if (!found) throw new Error(`Reward Decision scene asset is missing: ${name}`);
  return found;
};
const pair = (landscape: string, portrait: string) => ({ landscape: url(landscape), portrait: url(portrait) });

export const SCENES = {
  'opening': pair('rd-a01-hossam-marwan-opening-L.webp', 'rd-a01-hossam-marwan-opening-P.webp'),
  'marwan-reply': pair('rd-a02-marwan-replies-to-hossam-L.webp', 'rd-a02-marwan-replies-to-hossam-P.webp'),
  'debate': pair('rd-a04-hossam-dalia-debate-L.webp', 'rd-a04-hossam-dalia-debate-P.webp'),
  'policy-debate': pair('rd-a05-dalia-hossam-policy-discussion-L.webp', 'rd-a05-dalia-hossam-policy-discussion-P.webp'),
  'door-female': pair('rd-a06-ceo-door-player-female-L.webp', 'rd-a06-ceo-door-player-female-P.webp'),
  'door-male': pair('rd-a06-ceo-door-player-male-L.webp', 'rd-a06-ceo-door-player-male-P.webp'),
  'briefing-female': pair('rd-a07-sherif-briefing-player-female-L.webp', 'rd-a07-sherif-briefing-player-female-P.webp'),
  'briefing-male': pair('rd-a07-sherif-briefing-player-male-L.webp', 'rd-a07-sherif-briefing-player-male-P.webp'),
  'final-directions': pair('rd-a08-sherif-final-directions-L.webp', 'rd-a08-sherif-final-directions-P.png'),
  'corridor': pair('rd-a09-office-hub-corridor-L.webp', 'rd-a09-office-hub-corridor-P.webp'),
  'sales-female': pair('rd-a11-hossam-sales-player-female-L.webp', 'rd-a11-hossam-sales-player-female-P.webp'),
  'sales-male': pair('rd-a11-hossam-sales-player-male-L.webp', 'rd-a11-hossam-sales-player-male-P.webp'),
  'sales-records': pair('rd-a12-hossam-hands-individual-records-L.webp', 'rd-a12-hossam-hands-individual-records-P.webp'),
  'hr-female': pair('rd-a13-dalia-policy-player-female-L.webp', 'rd-a13-dalia-policy-player-female-P.webp'),
  'hr-male': pair('rd-a13-dalia-policy-player-male-L.webp', 'rd-a13-dalia-policy-player-male-P.webp'),
  'hr-guidance': pair('rd-a14-dalia-final-guidance-L.webp', 'rd-a14-dalia-final-guidance-P.webp'),
  'analyst-female': pair('rd-a15-analyst-workbench-female-L.webp', 'rd-a15-analyst-workbench-female-P.webp'),
  'analyst-male': pair('rd-a15-analyst-workbench-male-L.webp', 'rd-a15-analyst-workbench-male-P.webp'),
  'report-female': pair('rd-a17-analyst-reviews-report-female-L.webp', 'rd-a17-analyst-reviews-report-female-P.webp'),
  // Delivered portrait omits the initial "r"; preserve it and map the real filename.
  'report-male': pair('rd-a17-analyst-reviews-report-male-L.webp', 'd-a17-analyst-reviews-report-male-P.webp'),
  'meeting-opening': pair('rd-a18-meeting-opening-L.webp', 'rd-a18-meeting-opening-P.webp'),
  'meeting-player-female': pair('rd-a18-player-presents-female-L.webp', 'rd-a18-player-presents-female-P.webp'),
  'meeting-player-male': pair('rd-a18-player-presents-male-L.webp', 'rd-a18-player-presents-male-P.webp'),
  'meeting-neutral': pair('rd-a19-meeting-hossam-neutral-response-L.webp', 'rd-a19-meeting-hossam-neutral-response-P.webp'),
  'meeting-concerned': pair('rd-a20-meeting-hossam-concerned-response-L.webp', 'rd-a20-meeting-hossam-concerned-response-P.webp'),
  'phone-mahmoud-happy': pair('rd-a21-mahmoud-phone-happy-L.webp', 'rd-a21-mahmoud-phone-happy-P.webp'),
  'phone-mahmoud-upset': pair('rd-a21-mahmoud-phone-upset-L.webp', 'rd-a21-mahmoud-phone-upset-P.webp'),
  'phone-marwan-happy': pair('rd-a21-marwan-phone-happy-L.webp', 'rd-a21-marwan-phone-happy-P.webp'),
  'phone-marwan-upset': pair('rd-a21-marwan-phone-upset-L.webp', 'rd-a21-marwan-phone-upset-P.webp'),
  'phone-player-female-calm': pair('rd-a21-player-phone-female-calm-L.webp', 'rd-a21-player-phone-female-calm-P.webp'),
  'phone-player-female-concerned': pair('rd-a21-player-phone-female-concerned-L.webp', 'rd-a21-player-phone-female-concerned-P.webp'),
  'phone-player-male-calm': pair('rd-a21-player-phone-male-calm-L.webp', 'rd-a21-player-phone-male-calm-P.webp'),
  'phone-player-male-concerned': pair('rd-a21-player-phone-male-concerned-L.webp', 'rd-a21-player-phone-male-concerned-P.webp'),
  'completed-folder': pair('rd-a25-completed-recommendation-folder-alt-L.webp', 'rd-a25-completed-recommendation-folder-alt-P.webp'),
} as const;
export type SceneKey = keyof typeof SCENES;
export const PORTRAITS = {
  sherif: url('Mature Egyptian CEO in Navy Suit.webp'),
  hossam: url('Hossam, Egyptian sales director.webp'),
  dalia: url('Dalia, Egyptian HR leader in gray hijab.webp'),
  marwan: url('Marwan, Egyptian Sales Leader.webp'),
  mahmoud: url('Mahmoud’s New Look with Glasses.webp'),
  player_male: url('Cartoon analyst in gray shirt, black trousers.webp'),
  player_female: url('Egyptian Player Analyst in Taupe Hijab.webp'),
} as const;
