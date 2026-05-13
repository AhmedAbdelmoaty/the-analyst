import { genderLine, v } from "@/lib/genderText";
import type { DialogueLine } from "./types";

export const HISHAM_GREETING: DialogueLine[] = [
  {
    characterId: "hisham",
    text: genderLine([
      "أهلا وسهلا، ",
      v("نوّرت", "نورتي"),
      ". ",
      v("اتفضل", "اتفضلي"),
      " ",
      v("اقعد", "اقعدي"),
      "، أستاذ منصور كلمني عنك وقالي انك ",
      v("محلل بيانات شاطر", "محللة بيانات شاطرة"),
      ".",
    ]),
    mood: "happy",
    audioSrc: "/voiceover/hesham/hisham_arrival_01_welcome.mp3",
  },
  {
    characterId: "detective",
    text: "شكرا جدا يا أستاذ هشام. أستاذ منصور قالي إن حضرتك عاوز تتكلم في موضوع شاغلك.",
    mood: "neutral",
    audioSrc: "/voiceover/analyst_male/analyst_arrival_hisham_01_greeting.mp3",
  },
  {
    characterId: "hisham",
    text: "والله يا فندم… الشهر اللي فات ده حاسس إن في حاجة في الشغل مش ماشية. الحركة موجودة، بس فيه حاجة ناقصة.",
    mood: "concerned",
    audioSrc: "/voiceover/hesham/hisham_arrival_02_problem_feeling.mp3",
  },
  {
    characterId: "detective",
    text: "متشغلش بالك. خلينا نهدى ونفهم سوا. هسألك كام سؤال، وانت قولي اللي عندك.",
    mood: "confident",
    audioSrc: "/voiceover/analyst_male/analyst_arrival_hisham_02_calm_start.mp3",
  },
];

export const MANSOUR_INTRO_DIALOGUES: DialogueLine[] = [
  {
    characterId: "mansour",
    text: genderLine(["أهلاً، ", v("اتفضل", "اتفضلي"), " ", v("اقعد", "اقعدي"), ". عندنا استشارة جديدة محتاجة تركيز."]),
    mood: "neutral",
    audioSrc: "/voiceover/mansour/mansour_intro_office_01.mp3",
  },
  {
    characterId: "mansour",
    text: "عميل قديم لشركتنا، اسمه هشام الشريف، صاحب براند ملابس كبير. كلمنا وبيقول إن عنده مشكلة في الشغل الفترة دي.",
    mood: "neutral",
    audioSrc: "/voiceover/mansour/mansour_intro_office_02.mp3",
  },
  {
    characterId: "mansour",
    text: genderLine(["عايزك ", v("تروح", "تروحي"), " ", v("تقعد", "تقعدي"), " معاه وتوريني مهاراتك التحليلية."]),
    mood: "serious",
    audioSrc: "/voiceover/mansour/mansour_intro_office_03.mp3",
  },
  {
    characterId: "detective",
    text: "تمام يا أستاذ منصور، هروح وأحاول أفهم الصورة كاملة.",
    mood: "neutral",
    audioSrc: "/voiceover/analyst_male/analyst_intro_with_mansour_01_accept_task.mp3",
  },
  {
    characterId: "mansour",
    text: genderLine(["تمام، يلا بالتوفيق. ", v("خلّص", "خلّصي"), " و", v("ابعتلي", "ابعتيلي"), " تقرير كامل باللي ", v("وصلتله", "وصلتيله"), "."]),
    mood: "neutral",
    audioSrc: "/voiceover/mansour/mansour_intro_office_04.mp3",
  },
];

export const MANSOUR_DEBRIEF_STRONG: DialogueLine[] = [
  { characterId: "mansour", text: genderLine(["أهلاً… ", v("رجعت", "رجعتي"), ". ها، ", v("فهمت", "فهمتي"), " الصورة ولا لسه؟"]), mood: "neutral" },
  { characterId: "detective", text: "أيوه. هشام الشريف كان حاسس إن المبيعات أقل من المتوقع، وكان داخل على فكرة إنه يعمل عروض وخصومات. لكن المشكلة مش في البيع نفسه زي ما هو متخيل.", mood: "confident" },
  { characterId: "mansour", text: "كمّل.", mood: "serious" },
  { characterId: "detective", text: "هو بنى كلامه على إنه قارن فبراير 2026 بفبراير 2025. لكن لما بصّينا على فبراير 2024 كمان، طلع إن سنة 2025 هي اللي كانت طالعة عن الباقي، مش 2026 هي اللي واطية.", mood: "confident" },
  { characterId: "detective", text: "ولما فككنا الرقم لقينا إن سنة 2025 دخلت لها تحويلات كبيرة من فروع أخرى لوحدها طلّعت الرقم. لو عزلنا التحويلات دي، البيع للأفراد ماشي في نمو طبيعي. يعني لو كان عمل خصومات بسرعة، كان هياكل من الربح في غير محله.", mood: "confident" },
  { characterId: "mansour", text: genderLine(["ممتاز. دي بالضبط النقطة. ", v("إنت", "إنتي"), " ما ", v("خدتش", "خدتيش"), " وصف العميل للمشكلة كأنه الحقيقة، وما ", v("جريتش", "جريتيش"), " على الحل اللي هو كان داخل عليه."]), mood: "impressed" },
  { characterId: "mansour", text: genderLine(["القوة هنا مش إنك ", v("لقيت", "لقيتي"), " معلومة وخلاص… القوة إنك ", v("رجّعت", "رجّعتي"), " تعريف المشكلة نفسه لمكانه الصح. وده أهم جزء في الشغل ده."]), mood: "impressed" },
  { characterId: "mansour", text: genderLine(["شغلك المرة دي قوي. ", v("هاحسبها لك", "هاحسبهالك"), " تقرير مضبوط، و", v("مستواك", "مستواكي"), " في الكيس دي ممتاز."]), mood: "happy" },
];

export const MANSOUR_DEBRIEF_WEAK: DialogueLine[] = [
  { characterId: "mansour", text: genderLine(["ها، ", v("طمّني", "طمّنيني"), ". ", v("شايف", "شايفة"), " المشكلة كانت فين؟"]), mood: "neutral" },
  { characterId: "detective", text: "واضح إن البيع محتاج يتنشّط، وممكن العروض أو حملة تسويقية يكونوا خطوة مناسبة.", mood: "uncertain" },
  { characterId: "mansour", text: genderLine(["لا… هنا ", v("إنت استعجلت", "إنتي استعجلتي"), "."]), mood: "serious" },
  { characterId: "mansour", text: genderLine([v("إنت دخلت", "إنتي دخلتي"), " على الحل قبل ما ", v("تتأكد", "تتأكدي"), " أصلًا إن في مشكلة بيع حقيقية. وده بالضبط الغلط اللي كان هشام الشريف نفسه داخل عليه."]), mood: "serious" },
  { characterId: "mansour", text: genderLine(["كان لازم ", v("تسأل", "تسألي"), ": أقل من المتوقع مقارنة بإيه بالظبط؟ وكان لازم ", v("تتأكد", "تتأكدي"), " إن المرجع اللي بيحكم بيه صح من الأساس."]), mood: "serious" },
  { characterId: "mansour", text: genderLine(["لما العميل يوصّف لك موقف على إنه مشكلة، دورك مش إنك ", v("تساعده", "تساعديه"), " ينفذ أول حل جه في دماغه. دورك الأول إنك ", v("تتأكد", "تتأكدي"), ": هل دي فعلًا المشكلة؟ ولا المشكلة في طريقة فهمه ليها؟"]), mood: "serious" },
  { characterId: "mansour", text: genderLine(["في الكيس دي، ", v("إنت ما مسكتش", "إنتي ما مسكتيش"), " المرجع الأول، وبالتالي ", v("بنيت", "بنيتي"), " تقريرك على أرضية ضعيفة. وده كان هيؤدي لقرار غلط."]), mood: "disappointed" },
  { characterId: "mansour", text: genderLine([v("اعتبرها", "اعتبريها"), " محاولة ضعيفة. المرة الجاية: ما تجريش على السبب، وما تجريش على الحل… ", v("امسك", "امسكي"), " المرجع الأول."]), mood: "serious" },
];
