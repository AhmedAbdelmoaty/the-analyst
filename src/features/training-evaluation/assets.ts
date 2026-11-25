import art_boardroom from "./assets/art/boardroom.webp.asset.json";
import art_ceo_office from "./assets/art/ceo-office.webp.asset.json";
import art_cover from "./assets/art/cover.webp.asset.json";
import art_hr_desk from "./assets/art/hr-desk.webp.asset.json";
import art_player from "./assets/art/player.webp.asset.json";
import art_sherif from "./assets/art/sherif.webp.asset.json";
import art_tarek from "./assets/art/tarek.webp.asset.json";
import drive from "./assets/sayes/drive.png.asset.json";
import parking from "./assets/sayes/parking.png.asset.json";
import sWhistle from "./assets/sayes/whistle.webp.asset.json";
import sMoney from "./assets/sayes/money.webp.asset.json";
import sDisgusted from "./assets/sayes/disgusted.webp.asset.json";
import sSmart from "./assets/sayes/smart.webp.asset.json";
import sSmug from "./assets/sayes/smug.webp.asset.json";
import sPortrait from "./assets/sayes/portrait.webp.asset.json";

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

export const SAYES_ART = { whistle: sWhistle.url, money: sMoney.url, disgusted: sDisgusted.url, smart: sSmart.url, smug: sSmug.url, portrait: sPortrait.url } as const;

export type SceneKey = keyof typeof SCENES;

export const PORTRAITS = {
  tarek: art_tarek.url,
  sherif: art_sherif.url,
  seif: art_sherif.url,
  player: art_player.url,
} as const;
