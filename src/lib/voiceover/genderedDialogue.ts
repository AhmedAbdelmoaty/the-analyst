import { renderGenderText, type Gender, type GenderText } from "@/lib/genderText";

const FEMALE_AUDIO_AVAILABLE: ReadonlySet<string> = new Set<string>([
  "/voiceover/mansour/mansour_intro_office_01_female.mp3",
  "/voiceover/mansour/mansour_intro_office_02_female.mp3",
  "/voiceover/mansour/mansour_intro_office_03_female.mp3",
  "/voiceover/mansour/mansour_intro_office_04_female.mp3",
  "/voiceover/mansour/mansour_call_strong_female.mp3",
  "/voiceover/mansour/mansour_call_weak_01_female.mp3",
  "/voiceover/mansour/mansour_call_weak_02_female.mp3",

  "/voiceover/hesham/hisham_arrival_01_welcome_female.mp3",
  "/voiceover/hesham/hisham_arrival_02_problem_feeling_female.mp3",
  "/voiceover/hesham/hisham_s3_correct_year_report_female.mp3",
  "/voiceover/hesham/hisham_s4_correct_three_year_report_female.mp3",
  "/voiceover/hesham/hisham_s4_wrong_competitor_prices_female.mp3",
  "/voiceover/hesham/hisham_s5_correct_breakdown_female.mp3",
  "/voiceover/hesham/hisham_s5_wrong_marketing_entry_female.mp3",
  "/voiceover/hesham/hisham_track_a_01_team_performance_female.mp3",
  "/voiceover/hesham/hisham_track_d_03_marketing_report_female.mp3",
]);

const ANALYST_FEMALE_AUDIO_OVERRIDES: Readonly<Record<string, string>> = {
  "/voiceover/analyst_male/analyst_a_team_performance.mp3":
    "/voiceover/analyst_female/analyst_a_team_performance.mp3",
};

const ANALYST_FEMALE_AUDIO_AVAILABLE: ReadonlySet<string> = new Set<string>([
  "/voiceover/analyst_female/analyst_arrival_hisham_01_greeting_female.mp3",
  "/voiceover/analyst_female/analyst_arrival_hisham_02_calm_start_female.mp3",
  "/voiceover/analyst_female/analyst_a_conclusion_female.mp3",
  "/voiceover/analyst_female/analyst_a_team_conversion_female.mp3",
  "/voiceover/analyst_female/analyst_a_team_performance.mp3",
  "/voiceover/analyst_female/analyst_a_team_training_female.mp3",
  "/voiceover/analyst_female/analyst_c_conclusion_female.mp3",
  "/voiceover/analyst_female/analyst_c_customer_price_feedback_female.mp3",
  "/voiceover/analyst_female/analyst_c_price_response_female.mp3",
  "/voiceover/analyst_female/analyst_d_active_campaign_female.mp3",
  "/voiceover/analyst_female/analyst_d_conclusion_female.mp3",
  "/voiceover/analyst_female/analyst_d_marketing_report_female.mp3",
  "/voiceover/analyst_female/analyst_d_new_vs_returning_female.mp3",
  "/voiceover/analyst_female/analyst_ending_strong_response_female.mp3",
  "/voiceover/analyst_female/analyst_intro_with_mansour_01_accept_task_female.mp3",
  "/voiceover/analyst_female/analyst_s1_correct_open_problem_female.mp3",
  "/voiceover/analyst_female/analyst_s1_wrong_sales_team_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s2_correct_baseline_female.mp3",
  "/voiceover/analyst_female/analyst_s2_wrong_sales_report_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s3_correct_ask_report_female.mp3",
  "/voiceover/analyst_female/analyst_s3_wrong_competitors_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s4_correct_three_years_female.mp3",
  "/voiceover/analyst_female/analyst_s4_wrong_competitor_offers_entry_female.mp3",
  "/voiceover/analyst_female/analyst_s5_correct_breakdown_female.mp3",
  "/voiceover/analyst_female/analyst_s5_wrong_marketing_entry_female.mp3",
]);

const toFemaleCandidate = (maleSrc?: string): string | undefined => {
  if (!maleSrc || !maleSrc.endsWith(".mp3")) return undefined;
  if (maleSrc.endsWith("_female.mp3")) return maleSrc;
  return maleSrc.slice(0, -4) + "_female.mp3";
};

const toAnalystFemaleCandidate = (maleSrc: string): string => {
  const override = ANALYST_FEMALE_AUDIO_OVERRIDES[maleSrc];
  if (override) return override;

  const candidate = maleSrc
    .replace("/voiceover/analyst_male/", "/voiceover/analyst_female/")
    .replace(/\.mp3$/, "_female.mp3");

  return ANALYST_FEMALE_AUDIO_AVAILABLE.has(candidate) ? candidate : maleSrc;
};

export const getVoiceoverSrc = (
  maleSrc: string | undefined,
  gender: Gender | null | undefined,
): string | undefined => {
  if (!maleSrc) return undefined;
  if (gender !== "female") return maleSrc;

  if (maleSrc.includes("/voiceover/analyst_male/")) {
    return toAnalystFemaleCandidate(maleSrc);
  }

  const candidate = toFemaleCandidate(maleSrc);
  if (candidate && FEMALE_AUDIO_AVAILABLE.has(candidate)) return candidate;
  return maleSrc;
};

export interface GenderableLine {
  text: GenderText;
  audioSrc?: string;
  characterId?: string;
}

export const applyGenderToLine = <T extends GenderableLine>(
  line: T,
  gender: Gender | null | undefined,
): Omit<T, "text" | "audioSrc"> & { text: string; audioSrc?: string } => {
  const text = renderGenderText(line.text, gender);
  const audioSrc = getVoiceoverSrc(line.audioSrc, gender);
  return { ...line, text, audioSrc };
};
