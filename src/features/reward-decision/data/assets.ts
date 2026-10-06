import coverP from '../assets/rd-cover-p.webp.asset.json';import coverL from '../assets/rd-cover-l.webp.asset.json';
import hubP from '../assets/rd-hub-p.webp.asset.json';import hubL from '../assets/rd-hub-l.webp.asset.json';
import officeP from '../assets/rd-office-p.webp.asset.json';import officeL from '../assets/rd-office-l.webp.asset.json';
import fileP from '../assets/rd-file-p.webp.asset.json';import fileL from '../assets/rd-file-l.webp.asset.json';
import dataP from '../assets/rd-data-p.webp.asset.json';import dataL from '../assets/rd-data-l.webp.asset.json';
import meetingP from '../assets/rd-meeting-p.webp.asset.json';import meetingL from '../assets/rd-meeting-l.webp.asset.json';
import sherif from '../assets/rd-sherif.webp.asset.json';import hossam from '../assets/rd-hossam.webp.asset.json';import dalia from '../assets/rd-dalia.webp.asset.json';
import analyst from '@/assets/characters/analyst.webp';import analystMark from '@/assets/brand/the-analyst-mark.png';import sara from '@/assets/characters/sara.webp';
export interface ShotAsset{id:string;portrait:string;landscape:string;source:string;motionEnabled:boolean;focalPoint:string}
const src=(p:{url:string})=>p.url;
const pair={cover:[src(coverP),src(coverL)],hub:[src(hubP),src(hubL)],office:[src(officeP),src(officeL)],file:[src(fileP),src(fileL)],data:[src(dataP),src(dataL)],meeting:[src(meetingP),src(meetingL)]} as const;
const groups:Record<string,keyof typeof pair>={A00:'cover',A01:'hub',A02:'meeting',A03:'file',A04:'meeting',A05:'meeting',A06:'office',A07:'office',A08:'file',A09:'hub',A10:'hub',A11:'meeting',A12:'data',A13:'meeting',A14:'file',A15:'office',A16:'data',A17:'file',A18:'meeting',A19:'meeting',A20:'meeting',A21:'office',A22:'file',A23:'hub',A24:'file',A25:'data'};
export const SHOT_ASSETS=Object.fromEntries(Object.entries(groups).map(([id,g])=>[id,{id:`rd_${id.toLowerCase()}`,portrait:pair[g][0],landscape:pair[g][1],source:`Perception Lab/${g}`,motionEnabled:false,focalPoint:'50% 50%'}])) as Record<string,ShotAsset>;
/** Marwan/Mahmoud have no placeholder portrait yet: null renders a neutral initial badge instead of borrowing another character's face. */
export const PORTRAITS:Record<string,string|null>={sherif:src(sherif),hossam:src(hossam),dalia:src(dalia),marwan:null,mahmoud:null,player_male:analyst,player_female:sara,narrator:analystMark};
