import { genderLine, v } from "@/lib/genderText";
import type { DialogueLine } from "./types";

// مكالمة تليفونية بعد إرسال التقرير — نسخة مختصرة وسريعة
// بدون ترحيب، دخول مباشر في الموضوع، مع جملة تسويقية لـ IMP في النهاية

export const MANSOUR_CALL_STRONG: DialogueLine[] = [
  { characterId: "mansour", text: genderLine(["التقرير اللي ", v("بعتهولي", "بعتيهولي"), " ده شغل محترم. هشام الشريف اتصل بيا وكان مبسوط جداً. أهم حاجة ", v("عملتها", "عملتيها"), " صح إنك ", v("مبصتش", "مبصتيش"), " في الأرقام والتقارير على طول قبل ما ", v("تسأل", "تسألي"), " السؤال الصحيح، ", v("كنت هتقع", "كنتي هتقعي"), " في الغلطة اللي معظم محللين البيانات بيقعوا فيها"]), mood: "happy", audioSrc: "/voiceover/mansour/mansour_call_strong.mp3" },
  { characterId: "detective", text: "الفضل كله يرجع لدبلومة تحليل البيانات من IMP.", mood: "happy", audioSrc: "/voiceover/analyst_male/analyst_ending_strong_response.mp3" },
];

export const MANSOUR_CALL_WEAK: DialogueLine[] = [
  { characterId: "mansour", text: genderLine(["التقرير ده مش اللي كنت متوقعه منك خالص. ", v("إنت دخلت", "إنتي دخلتي"), " على الحل قبل ما ", v("تتأكد", "تتأكدي"), " إن في مشكلة أصلًا!\n\nلو هشام نفّذ اللي ", v("إنت كاتبه", "إنتي كاتباه"), " ده هيروح في داهية، وهييجي يقول لنا إنتو نصحتوني غلط. إحنا كمحللين بيانات لازم نفهم المشكلة الأول، مش نمشي ورا أول كلمة العميل يقولها."]), mood: "disappointed", audioSrc: "/voiceover/mansour/mansour_call_weak_01.mp3" },
  { characterId: "mansour", text: genderLine(["الـ Problem Framing مش رفاهية. ده الفرق بين محلل بيانات حقيقي وحد بيكتب تقارير وخلاص. أنا هخصملك يومين والتقييم ضعيف.\n", v("روح ذاكر", "روحي ذاكري"), " دبلومة تحليل البيانات من IMP. هتساعدك جدًا إنك ", v("تطوّر", "تطوّري"), " تفكيرك."]), mood: "serious", audioSrc: "/voiceover/mansour/mansour_call_weak_02.mp3" },
];
