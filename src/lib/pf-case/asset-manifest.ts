import type { PFScreen } from "@/lib/pf-game-persistence";

import prismBuildingImg from "@/assets/scenes/prism-building-exterior.webp";
import prismHallwayImg from "@/assets/scenes/prism-hallway.webp";
import prismKnockMaleImg from "@/assets/scenes/prism-knock-male.webp";
import prismKnockFemaleImg from "@/assets/scenes/prism-knock-female.webp";
import mansourWelcomeMaleImg from "@/assets/scenes/mansour-office-welcome-male.webp";
import mansourWelcomeFemaleImg from "@/assets/scenes/mansour-office-welcome-female.webp";
import mansourSeatedMaleImg from "@/assets/scenes/mansour-office-seated-male.webp";
import mansourSeatedFemaleImg from "@/assets/scenes/mansour-office-seated-female.webp";
import cityDriveLuxuryMaleImg from "@/assets/scenes/city-drive-luxury-male.webp";
import cityDriveLuxuryFemaleImg from "@/assets/scenes/city-drive-luxury-female.webp";
import velaroStreetImg from "@/assets/scenes/velaro-street.webp";
import velaroStorefrontImg from "@/assets/scenes/velaro-storefront.webp";
import velaroEnteringMaleImg from "@/assets/scenes/velaro-entering-male.webp";
import velaroEnteringFemaleImg from "@/assets/scenes/velaro-entering-female.webp";
import velaroInteriorWideImg from "@/assets/scenes/velaro-interior-wide.webp";
import hishamGreetingMaleImg from "@/assets/scenes/hisham-greeting-male.webp";
import hishamGreetingFemaleImg from "@/assets/scenes/hisham-greeting-female.webp";
import hishamOfficeSeatedMaleImg from "@/assets/scenes/hisham-office-seated-male.webp";
import hishamOfficeSeatedFemaleImg from "@/assets/scenes/hisham-office-seated-female.webp";
import hishamHandingReportMaleImg from "@/assets/scenes/hisham-handing-report-male.webp";
import hishamHandingReportFemaleImg from "@/assets/scenes/hisham-handing-report-female.webp";
import velaroCheckoutBusyImg from "@/assets/scenes/velaro-checkout-busy.webp";
import velaroWomensSectionImg from "@/assets/scenes/velaro-womens-section.webp";
import velaroMensSectionImg from "@/assets/scenes/velaro-mens-section.webp";
import analystReflectingMaleImg from "@/assets/scenes/analyst-reflecting-male.webp";
import analystReflectingFemaleImg from "@/assets/scenes/analyst-reflecting-female.webp";
import framingBoardDeskImg from "@/assets/scenes/framing-board-desk.webp";
import analystLaptopMaleImg from "@/assets/photos/analyst-laptop-evening-male.webp";
import analystLaptopFemaleImg from "@/assets/photos/analyst-laptop-evening-female.webp";
import mansourReadingImg from "@/assets/photos/mansour-reading-email.webp";
import mansourPhoneImg from "@/assets/photos/mansour-picking-phone.webp";
import analystRelaxingMaleImg from "@/assets/photos/analyst-relaxing-male.webp";
import analystRelaxingFemaleImg from "@/assets/photos/analyst-relaxing-female.webp";
import mansourAvatarImg from "@/assets/photos/mansour-avatar-circle.webp";
import mansourStrongA from "@/assets/scenes/mansour-call-strong-a.webp";
import mansourStrongB from "@/assets/scenes/mansour-call-strong-b.webp";
import mansourWeakA from "@/assets/scenes/mansour-call-weak-a.webp";
import mansourWeakB from "@/assets/scenes/mansour-call-weak-b.webp";
import analystPhoneMale from "@/assets/photos/analyst-on-phone-male.webp";
import analystPhoneFemale from "@/assets/photos/analyst-on-phone-female.webp";
import analystPhoneMaleWeak from "@/assets/photos/analyst-on-phone-male-weak.webp";
import analystPhoneFemaleWeak from "@/assets/photos/analyst-on-phone-female-weak.webp";
import resultFemaleStrong from "@/assets/results/result-mascot-female-strong.webp";
import resultFemaleWeak from "@/assets/results/result-mascot-female-weak.webp";
import resultMaleStrong from "@/assets/results/result-mascot-male-strong.webp";
import resultMaleWeak from "@/assets/results/result-mascot-male-weak.webp";
import analystCharacterImg from "@/assets/characters/analyst.webp";
import saraCharacterImg from "@/assets/characters/sara.webp";
import hishamCharacterImg from "@/assets/characters/hesham.webp";
import mansourCharacterImg from "@/assets/characters/mansour.webp";
import karimCharacterImg from "@/assets/characters/karim.webp";
import nouraCharacterImg from "@/assets/characters/noura.webp";

export interface ScreenAssetGroup {
  images: string[];
  audio: string[];
}

const COMMON_CHARACTER_IMAGES = [
  analystCharacterImg,
  saraCharacterImg,
  hishamCharacterImg,
  mansourCharacterImg,
  karimCharacterImg,
  nouraCharacterImg,
];

const SCENE_AUDIO = {
  hallway_footsteps: "/sounds/ambience_office_hallway_footsteps.mp3",
  door_knock: "/sounds/interaction_office_door_knock.mp3",
  car_traffic: "/sounds/ambience_car_driving_traffic.mp3",
  storefront_street: "/sounds/ambience_storefront_street.mp3",
  store_interior: "/sounds/ambience_store_interior_light.mp3",
  report_writing: "/sounds/interaction_report_writing_paper.mp3",
  keyboard_typing: "/sounds/interaction_keyboard_typing.mp3",
  phone_ringtone: "/sounds/interaction_phone_ringtone.mp3",
};

const MANSOUR_INTRO_AUDIO = [
  "/voiceover/mansour/mansour_intro_office_01.mp3",
  "/voiceover/mansour/mansour_intro_office_01_female.mp3",
  "/voiceover/mansour/mansour_intro_office_02.mp3",
  "/voiceover/mansour/mansour_intro_office_02_female.mp3",
  "/voiceover/mansour/mansour_intro_office_03.mp3",
  "/voiceover/mansour/mansour_intro_office_03_female.mp3",
  "/voiceover/mansour/mansour_intro_office_04.mp3",
  "/voiceover/mansour/mansour_intro_office_04_female.mp3",
  "/voiceover/analyst_male/analyst_intro_with_mansour_01_accept_task.mp3",
  "/voiceover/analyst_female/analyst_intro_with_mansour_01_accept_task_female.mp3",
];

const HISHAM_ARRIVAL_AUDIO = [
  "/voiceover/hesham/hisham_arrival_01_welcome.mp3",
  "/voiceover/hesham/hisham_arrival_01_welcome_female.mp3",
  "/voiceover/hesham/hisham_arrival_02_problem_feeling.mp3",
  "/voiceover/hesham/hisham_arrival_02_problem_feeling_female.mp3",
  "/voiceover/analyst_male/analyst_arrival_hisham_01_greeting.mp3",
  "/voiceover/analyst_female/analyst_arrival_hisham_01_greeting_female.mp3",
  "/voiceover/analyst_male/analyst_arrival_hisham_02_calm_start.mp3",
  "/voiceover/analyst_female/analyst_arrival_hisham_02_calm_start_female.mp3",
];

const INQUIRY_AUDIO = [
  "/voiceover/analyst_male/analyst_s1_correct_open_problem.mp3",
  "/voiceover/analyst_male/analyst_s2_correct_baseline.mp3",
  "/voiceover/analyst_male/analyst_s3_correct_ask_report.mp3",
  "/voiceover/analyst_male/analyst_s4_correct_three_years.mp3",
  "/voiceover/analyst_male/analyst_s5_correct_breakdown.mp3",
  "/voiceover/analyst_male/analyst_s1_wrong_sales_team_entry.mp3",
  "/voiceover/analyst_male/analyst_s2_wrong_sales_report_entry.mp3",
  "/voiceover/analyst_male/analyst_s3_wrong_competitors_entry.mp3",
  "/voiceover/analyst_male/analyst_s4_wrong_competitor_offers_entry.mp3",
  "/voiceover/analyst_male/analyst_s5_wrong_marketing_entry.mp3",
  "/voiceover/analyst_male/analyst_a_team_performance.mp3",
  "/voiceover/analyst_male/analyst_a_team_conversion.mp3",
  "/voiceover/analyst_male/analyst_a_team_training.mp3",
  "/voiceover/analyst_male/analyst_a_conclusion.mp3",
  "/voiceover/analyst_male/analyst_c_customer_price_feedback.mp3",
  "/voiceover/analyst_male/analyst_c_price_response.mp3",
  "/voiceover/analyst_male/analyst_c_conclusion.mp3",
  "/voiceover/analyst_male/analyst_d_active_campaign.mp3",
  "/voiceover/analyst_male/analyst_d_new_vs_returning.mp3",
  "/voiceover/analyst_male/analyst_d_marketing_report.mp3",
  "/voiceover/analyst_male/analyst_d_conclusion.mp3",
  "/voiceover/analyst_female/analyst_s1_correct_open_problem_female.mp3",
  "/voiceover/analyst_female/analyst_s2_correct_baseline_female.mp3",
  "/voiceover/analyst_female/analyst_s3_correct_ask_report_female.mp3",
  "/voiceover/analyst_female/analyst_s4_correct_three_years_female.mp3",
  "/voiceover/analyst_female/analyst_s5_correct_breakdown_female.mp3",
  "/voiceover/analyst_female/analyst_s1_wrong_sales_team_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s2_wrong_sales_report_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s3_wrong_competitors_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s4_wrong_competitor_offers_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s5_wrong_marketing_entry_female.mp3",
  "/voiceover/analyst_female/analyst_a_team_performance.mp3",
  "/voiceover/analyst_female/analyst_a_team_conversion_female.mp3",
  "/voiceover/analyst_female/analyst_a_team_training_female.mp3",
  "/voiceover/analyst_female/analyst_a_conclusion_female.mp3",
  "/voiceover/analyst_female/analyst_c_customer_price_feedback_female.mp3",
  "/voiceover/analyst_female/analyst_c_price_response_female.mp3",
  "/voiceover/analyst_female/analyst_c_conclusion_female.mp3",
  "/voiceover/analyst_female/analyst_d_active_campaign_female.mp3",
  "/voiceover/analyst_female/analyst_d_new_vs_returning_female.mp3",
  "/voiceover/analyst_female/analyst_d_marketing_report_female.mp3",
  "/voiceover/analyst_female/analyst_d_conclusion_female.mp3",
  "/voiceover/hesham/hisham_s1_correct_problem_open.mp3",
  "/voiceover/hesham/hisham_s1_wrong_sales_team_entry.mp3",
  "/voiceover/hesham/hisham_s2_correct_baseline.mp3",
  "/voiceover/hesham/hisham_s2_wrong_daily_sales_report.mp3",
  "/voiceover/hesham/hisham_s3_correct_year_report.mp3",
  "/voiceover/hesham/hisham_s3_correct_year_report_female.mp3",
  "/voiceover/hesham/hisham_s3_wrong_competitors_entry.mp3",
  "/voiceover/hesham/hisham_s4_correct_three_year_report.mp3",
  "/voiceover/hesham/hisham_s4_correct_three_year_report_female.mp3",
  "/voiceover/hesham/hisham_s4_wrong_competitor_prices.mp3",
  "/voiceover/hesham/hisham_s4_wrong_competitor_prices_female.mp3",
  "/voiceover/hesham/hisham_s5_correct_breakdown.mp3",
  "/voiceover/hesham/hisham_s5_correct_breakdown_female.mp3",
  "/voiceover/hesham/hisham_s5_wrong_marketing_entry.mp3",
  "/voiceover/hesham/hisham_s5_wrong_marketing_entry_female.mp3",
  "/voiceover/hesham/hisham_track_a_01_team_performance.mp3",
  "/voiceover/hesham/hisham_track_a_01_team_performance_female.mp3",
  "/voiceover/hesham/hisham_track_a_02_team_conversion.mp3",
  "/voiceover/hesham/hisham_track_a_03_team_training.mp3",
  "/voiceover/hesham/hisham_track_a_04_conclusion.mp3",
  "/voiceover/hesham/hisham_track_c_01_customer_price_feedback.mp3",
  "/voiceover/hesham/hisham_track_c_02_price_response.mp3",
  "/voiceover/hesham/hisham_track_c_03_conclusion.mp3",
  "/voiceover/hesham/hisham_track_d_01_active_campaign.mp3",
  "/voiceover/hesham/hisham_track_d_02_new_vs_returning.mp3",
  "/voiceover/hesham/hisham_track_d_03_marketing_report.mp3",
  "/voiceover/hesham/hisham_track_d_03_marketing_report_female.mp3",
  "/voiceover/hesham/hisham_track_d_04_conclusion.mp3",
];

const CALL_AUDIO = [
  "/voiceover/mansour/mansour_call_strong.mp3",
  "/voiceover/mansour/mansour_call_strong_female.mp3",
  "/voiceover/mansour/mansour_call_weak_01.mp3",
  "/voiceover/mansour/mansour_call_weak_01_female.mp3",
  "/voiceover/mansour/mansour_call_weak_02.mp3",
  "/voiceover/mansour/mansour_call_weak_02_female.mp3",
  "/voiceover/analyst_male/analyst_ending_strong_response.mp3",
  "/voiceover/analyst_female/analyst_ending_strong_response_female.mp3",
];

const uniq = (items: string[]) => Array.from(new Set(items));

export const SCREEN_ASSETS: Record<PFScreen, ScreenAssetGroup> = {
  "company-briefing": {
    images: uniq([
      prismBuildingImg,
      prismHallwayImg,
      prismKnockMaleImg,
      prismKnockFemaleImg,
      mansourWelcomeMaleImg,
      mansourWelcomeFemaleImg,
      mansourSeatedMaleImg,
      mansourSeatedFemaleImg,
      ...COMMON_CHARACTER_IMAGES,
    ]),
    audio: uniq([SCENE_AUDIO.hallway_footsteps, SCENE_AUDIO.door_knock, ...MANSOUR_INTRO_AUDIO]),
  },
  "replay-briefing": {
    images: uniq([mansourSeatedMaleImg, mansourSeatedFemaleImg, ...COMMON_CHARACTER_IMAGES]),
    audio: uniq(MANSOUR_INTRO_AUDIO),
  },
  travel: {
    images: [cityDriveLuxuryMaleImg, cityDriveLuxuryFemaleImg],
    audio: [SCENE_AUDIO.car_traffic],
  },
  "velaro-street": {
    images: [velaroStreetImg],
    audio: [SCENE_AUDIO.storefront_street],
  },
  arrival: {
    images: uniq([
      velaroStorefrontImg,
      velaroEnteringMaleImg,
      velaroEnteringFemaleImg,
      velaroInteriorWideImg,
      hishamGreetingMaleImg,
      hishamGreetingFemaleImg,
      hishamOfficeSeatedMaleImg,
      hishamOfficeSeatedFemaleImg,
      ...COMMON_CHARACTER_IMAGES,
    ]),
    audio: uniq([SCENE_AUDIO.storefront_street, SCENE_AUDIO.store_interior, ...HISHAM_ARRIVAL_AUDIO]),
  },
  inquiry: {
    images: uniq([
      velaroInteriorWideImg,
      velaroCheckoutBusyImg,
      velaroWomensSectionImg,
      velaroMensSectionImg,
      hishamOfficeSeatedMaleImg,
      hishamOfficeSeatedFemaleImg,
      hishamGreetingMaleImg,
      hishamGreetingFemaleImg,
      hishamHandingReportMaleImg,
      hishamHandingReportFemaleImg,
      ...COMMON_CHARACTER_IMAGES,
    ]),
    audio: uniq([SCENE_AUDIO.store_interior, ...INQUIRY_AUDIO]),
  },
  reflection: {
    images: [analystReflectingMaleImg, analystReflectingFemaleImg],
    audio: [SCENE_AUDIO.report_writing],
  },
  framing: {
    images: [framingBoardDeskImg],
    audio: [SCENE_AUDIO.report_writing],
  },
  "email-send": {
    images: [analystLaptopMaleImg, analystLaptopFemaleImg],
    audio: [SCENE_AUDIO.keyboard_typing],
  },
  "mansour-receives": {
    images: [mansourReadingImg, mansourPhoneImg],
    audio: [],
  },
  "incoming-call": {
    images: [analystRelaxingMaleImg, analystRelaxingFemaleImg, mansourAvatarImg],
    audio: [SCENE_AUDIO.phone_ringtone],
  },
  "phone-call": {
    images: uniq([
      mansourStrongA,
      mansourStrongB,
      mansourWeakA,
      mansourWeakB,
      analystPhoneMale,
      analystPhoneFemale,
      analystPhoneMaleWeak,
      analystPhoneFemaleWeak,
      ...COMMON_CHARACTER_IMAGES,
    ]),
    audio: CALL_AUDIO,
  },
  result: {
    images: [resultFemaleStrong, resultFemaleWeak, resultMaleStrong, resultMaleWeak],
    audio: [],
  },
};

export const SCREEN_ORDER: PFScreen[] = [
  "company-briefing",
  "travel",
  "velaro-street",
  "arrival",
  "inquiry",
  "reflection",
  "framing",
  "email-send",
  "mansour-receives",
  "incoming-call",
  "phone-call",
  "result",
];

export const getNextScreen = (screen: PFScreen): PFScreen | null => {
  if (screen === "replay-briefing") return null;
  const index = SCREEN_ORDER.indexOf(screen);
  if (index < 0 || index >= SCREEN_ORDER.length - 1) return null;
  return SCREEN_ORDER[index + 1];
};

