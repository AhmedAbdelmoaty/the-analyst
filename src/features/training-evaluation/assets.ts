import { ATTENDANT, CHARACTERS } from "./cinematic";
import art_boardroom from "./assets/art/boardroom.webp.asset.json";
import art_ceo_office from "./assets/art/ceo-office.webp.asset.json";
import art_cover from "./assets/art/cover.webp.asset.json";
import art_hr_desk from "./assets/art/hr-desk.webp.asset.json";
import drive from "./assets/sayes/drive.png.asset.json";
import parking from "./assets/sayes/parking.png.asset.json";

export const SCENES = {
  cover: { l: art_cover.url, p: art_cover.url },
  meeting: { l: art_boardroom.url, p: art_boardroom.url },
  brief: { l: art_boardroom.url, p: art_boardroom.url },
  corridor: { l: art_hr_desk.url, p: art_hr_desk.url },
  desk: { l: art_hr_desk.url, p: art_hr_desk.url },
  ceo: { l: art_ceo_office.url, p: art_ceo_office.url },
  drive: { l: drive.url, p: drive.url },
  parking: { l: parking.url, p: parking.url },
} as const;

// Parking attendant poses → approved expressions (same dialogue moments as before).
export const SAYES_ART = { whistle: ATTENDANT.talking, money: ATTENDANT.requestingPayment, disgusted: ATTENDANT.objecting, smart: ATTENDANT.happy, smug: ATTENDANT.angry, portrait: ATTENDANT.default } as const;

export type SceneKey = keyof typeof SCENES;

export const PORTRAITS = {
  tarek: CHARACTERS.tarek,
  sherif: CHARACTERS.seif,
  seif: CHARACTERS.seif,
  player: CHARACTERS.analyst,
} as const;
