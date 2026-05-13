export type Gender = "male" | "female";

export interface GenderVariant {
  male: string;
  female: string;
}

export type GenderTextPart = string | GenderVariant;
export type GenderText = string | GenderTextPart[];

export const v = (male: string, female: string): GenderVariant => ({ male, female });

export const genderLine = (parts: GenderTextPart[]): GenderTextPart[] => parts;

export const renderGenderText = (
  text: GenderText | undefined,
  gender: Gender | null | undefined,
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text.map((part) => (typeof part === "string" ? part : gender === "female" ? part.female : part.male)).join("");
};

export const renderMaleText = (text: GenderText | undefined): string => renderGenderText(text, "male");
