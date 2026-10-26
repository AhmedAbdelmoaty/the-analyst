/* Recorded level-one dialogue. Missing recordings remain text-only. */
(function(root){
const clips={
  "L01_IN_01_OMAR": {
    "id": "L01_IN_01_OMAR",
    "scene": "الافتتاحية",
    "speaker": "OMAR",
    "trigger": "بداية الاجتماع؛ يضع القلم على الورق قبل الكلام.",
    "delivery": "Controlled impatience. A short pause after the first sentence. Stress the final question, not the amount.",
    "text": "استنّوا بس. تمانين ألف جنيه اتصرفوا الشهر اللي فات. قبل ما أمضي ميزانية جديدة، عايز أعرف: مين فيهم جاب عملاء بتكلفة أقل؟",
    "who": "omar",
    "file": "L01_IN_01_OMAR.wav"
  },
  "L01_IN_02_KARIM": {
    "id": "L01_IN_02_KARIM",
    "scene": "الافتتاحية",
    "speaker": "KARIM",
    "trigger": "بعد عمر؛ يتقدم قليلًا وكأنه كان مستني فرصته.",
    "delivery": "Eager, defending a reasonable case. Slow down on the one-and-a-half comparison. Stress that the larger spend belongs to Facebook.",
    "text": "تيك توك أخد أصغر ميزانية. فيسبوك جاب عدد عملاء قدّنا مرة ونص، بس صرف أكتر من ضعفنا. أنا بقول نستاهل فرصة أكبر.",
    "who": "karim",
    "file": "L01_IN_02_KARIM.wav"
  },
  "L01_IN_03_SARA": {
    "id": "L01_IN_03_SARA",
    "scene": "الافتتاحية",
    "speaker": "SARA",
    "trigger": "ترد على كريم، لا على اللاعب.",
    "delivery": "A precise counterargument, with a slight edge but no sneer. Give the two Google comparisons separate clear clauses.",
    "text": "بس إنت بتقارن نفسك بفيسبوك وبس. إنستجرام جاب عملاء أكتر من جوجل، وجوجل أكتر منصة صرفت.",
    "who": "sara",
    "file": "L01_IN_03_SARA.wav"
  },
  "L01_IN_04_KARIM": {
    "id": "L01_IN_04_KARIM",
    "scene": "الافتتاحية",
    "speaker": "KARIM",
    "trigger": "اعتراض بشري قصير؛ لا يضيف دليلًا جديدًا.",
    "delivery": "Slightly defensive, a fraction quicker, then settle. No raised voice.",
    "text": "ما أنا معنديش ميزانية جوجل. ادّوني فرصة الأول، وبعدين حاسبوني.",
    "who": "karim",
    "file": "L01_IN_04_KARIM.wav"
  },
  "L01_IN_05_NADIA": {
    "id": "L01_IN_05_NADIA",
    "scene": "الافتتاحية",
    "speaker": "NADIA",
    "trigger": "تقطع الجدل بالرجوع للسجل.",
    "delivery": "Ground the room. Calm certainty, not an accusation. Stress that Google exceeds Facebook in customers.",
    "text": "خلّونا في اللي اتراجع. جوجل جاب عملاء أكتر من فيسبوك. والأعداد دي أنا متأكدة منها.",
    "who": "nadia",
    "file": "L01_IN_05_NADIA.wav"
  },
  "L01_IN_06_MARYAM": {
    "id": "L01_IN_06_MARYAM",
    "scene": "الافتتاحية",
    "speaker": "MARYAM",
    "trigger": "تثبت تعريف العميل والفترة.",
    "delivery": "Matter-of-fact clarification. Make paid new customers and the same month especially clear.",
    "text": "وإحنا بنتكلم عن عملاء جدد اشتروا فعلًا، في نفس الشهر. مش رسايل ولا أرقام واتساب.",
    "who": "mariam",
    "file": "L01_IN_06_MARYAM.wav"
  },
  "L01_IN_07_SARA": {
    "id": "L01_IN_07_SARA",
    "scene": "الافتتاحية",
    "speaker": "SARA",
    "trigger": "ترد على اتهام الانحياز ضمنيًا.",
    "delivery": "Less combative now. She wants a complete comparison; do not imply she already knows the final calculation.",
    "text": "أنا مش بطلب نزودها عشان أنا ماسكاها. بس لو هنقارن، يبقى نحط الأربع منصات جنب بعض.",
    "who": "sara",
    "file": "L01_IN_07_SARA.wav"
  },
  "L01_IN_08_OMAR": {
    "id": "L01_IN_08_OMAR",
    "scene": "الافتتاحية",
    "speaker": "OMAR",
    "trigger": "يلتفت للمحلل؛ هنا ينتقل زمام الفعل للاعب.",
    "delivery": "Address the new analyst directly. Firm, testing their reasoning, with a small pause before the last two words.",
    "text": "طيب. كل واحد قال اللي في صالحه. إنت لسه جاي، ومش ماسك أي منصة. اربط التقرير بكلامهم، وقولي نختبر الزيادة فين... وليه.",
    "who": "omar",
    "file": "L01_IN_08_OMAR.wav"
  },
  "L01_HANDOFF_01_NADIA": {
    "id": "L01_HANDOFF_01_NADIA",
    "scene": "استلام الملف",
    "speaker": "NADIA",
    "trigger": "بعد انتهاء الافتتاحية؛ زر استلم الملف.",
    "delivery": "Helpful and practical. Explain a missing export column without sounding apologetic or mysterious.",
    "text": "اتفضل. أعداد العملاء سليمة، بس عمود أسماء المنصات ناقص في نسخة التصدير اللي وصلت لنا. تقرير الإنفاق كامل، ومحضر الاجتماع معاه. كل عدد يخص منصة واحدة.",
    "who": "nadia",
    "file": "L01_HANDOFF_01_NADIA.wav"
  },
  "L01_ASK_01_SARA": {
    "id": "L01_ASK_01_SARA",
    "scene": "أسئلة اختيارية",
    "speaker": "SARA",
    "trigger": "سؤال اللاعب المكتوب: أكتب إنستجرام هو الاختيار وخلاص؟",
    "delivery": "Correct a premature conclusion. Patient, precise, with a small emphasis on the difference between evidence and a decision.",
    "text": "أنا قلت إن عدد عملاء إنستجرام أعلى من جوجل. دي معلومة تساعدك تربط. إنما القرار؟ استنى لما تحسب تكلفة العميل في الأربع منصات.",
    "who": "sara",
    "file": "L01_ASK_01_SARA.wav"
  },
  "L01_ASK_02_KARIM": {
    "id": "L01_ASK_02_KARIM",
    "scene": "أسئلة اختيارية",
    "speaker": "KARIM",
    "trigger": "سؤال اللاعب المكتوب: قدّكم مرة ونص يعني إيه بالظبط؟",
    "delivery": "Explain the ratio naturally, without patronizing. Slow slightly for two and three.",
    "text": "يعني لكل اتنين عملاء عند تيك توك، فيه تلاتة عند فيسبوك. دي النسبة، مش عدد العملاء.",
    "who": "karim",
    "file": "L01_ASK_02_KARIM.wav"
  },
  "L01_ASK_03_OMAR": {
    "id": "L01_ASK_03_OMAR",
    "scene": "أسئلة اختيارية",
    "speaker": "OMAR",
    "trigger": "سؤال اللاعب المكتوب: عايز أكبر عدد، ولا أقل تكلفة؟",
    "delivery": "Dry, concise authority. A little understated humor on the last phrase, never a threat.",
    "text": "عايز أوصل لعميل جديد بتكلفة أقل. مش هدي أكبر شيك للي بيطلب بصوت أعلى.",
    "who": "omar",
    "file": "L01_ASK_03_OMAR.wav"
  },
  "L01_ASK_04_NADIA": {
    "id": "L01_ASK_04_NADIA",
    "scene": "أسئلة اختيارية",
    "speaker": "NADIA",
    "trigger": "سؤال اللاعب المكتوب: متأكدين إننا بنقارن نفس نوع العملاء؟",
    "delivery": "Warm, certain, grounded in the records. No lecturer cadence.",
    "text": "أيوه. ناس جديدة اشترت فعلًا. الشهر واحد، والمراجعة واحدة، وكل عدد في الملف تابع لمنصة واحدة.",
    "who": "nadia",
    "file": "L01_ASK_04_NADIA.wav"
  },
  "L01_ASK_05_MARYAM": {
    "id": "L01_ASK_05_MARYAM",
    "scene": "أسئلة اختيارية",
    "speaker": "MARYAM",
    "trigger": "سؤال اللاعب المكتوب: أقارنهم إزاي بعد ما أربط الأعداد؟",
    "delivery": "Explain the division in two natural phrases. Keep spent divided by customers unambiguous.",
    "text": "اقسم اللي اتصرف على كل منصة على عدد العملاء اللي جابتهم. كده بتقارن تكلفة العميل، مش حجم الفاتورة.",
    "who": "mariam",
    "file": "L01_ASK_05_MARYAM.wav"
  },
  "L01_MATRIX_01_MARYAM": {
    "id": "L01_MATRIX_01_MARYAM",
    "scene": "بدء المصفوفة",
    "speaker": "MARYAM",
    "trigger": "أول فتح للمصفوفة فقط؛ قابل للتخطي.",
    "delivery": "Brief colleague-to-colleague guidance. Clearly distinguish first, second, and third clicks.",
    "text": "هنا هتربط كل منصة بعدد عملائها. أول ضغطة تستبعد، التانية تثبّت، والتالتة تمسح. ولما تثبّت اختيار، باقي الصف والعمود بيتستبعدوا لوحدهم.",
    "who": "mariam",
    "file": null
  },
  "L01_HINT_01_MARYAM": {
    "id": "L01_HINT_01_MARYAM",
    "scene": "تلميحات اختيارية",
    "speaker": "MARYAM",
    "trigger": "طلب التلميح الأول فقط.",
    "delivery": "A nudge, not a solution. Leave thinking space at the end.",
    "text": "ابدأ بكلام كريم. أنهي عددين في الملف ممكن يبقى واحد فيهم قدّ التاني مرة ونص؟ جرّب الاحتمالات الأول.",
    "who": "mariam",
    "file": "L01_HINT_01_MARYAM.wav"
  },
  "L01_HINT_02_NADIA": {
    "id": "L01_HINT_02_NADIA",
    "scene": "تلميحات اختيارية",
    "speaker": "NADIA",
    "trigger": "طلب التلميح الثاني فقط.",
    "delivery": "Clear logical ordering. Small pauses between Facebook, Google, and Instagram.",
    "text": "خد ترتيبنا جنب النسبة: جوجل أعلى من فيسبوك، وإنستجرام أعلى من جوجل. لازم يفضل عندك عددين أكبر من عدد فيسبوك.",
    "who": "nadia",
    "file": "L01_HINT_02_NADIA.wav"
  },
  "L01_HINT_03_MARYAM": {
    "id": "L01_HINT_03_MARYAM",
    "scene": "تلميحات اختيارية",
    "speaker": "MARYAM",
    "trigger": "طلب التلميح الثالث؛ توجيه لمعيار القرار.",
    "delivery": "Calm and practical. Deliberately articulate the division order.",
    "text": "بعد الربط، اقسم مصروف كل منصة على عدد عملائها. إنت بتدور على أقل تكلفة للعميل، مش على أصغر مبلغ اتصرف.",
    "who": "mariam",
    "file": "L01_HINT_03_MARYAM.wav"
  },
  "L01_MAP_FAIL_01_OMAR": {
    "id": "L01_MAP_FAIL_01_OMAR",
    "scene": "خطأ الربط",
    "speaker": "OMAR",
    "trigger": "تحقق من الحل: الربط غير صحيح؛ لا يكشف خانة بعينها.",
    "delivery": "Controlled disappointment, directed personally at the analyst. Dry, skeptical, no shouting. Pause before the final challenge.",
    "text": "هو ده تحليلك؟ أنا مستني منك تفكّ الاشتباك، مش تزود عليه. ارجع راجع الربط... قبل ما تطلب مني أثق في قرارك.",
    "who": "omar",
    "file": "L01_MAP_FAIL_01_OMAR.wav"
  },
  "L01_MAP_FAIL_02_MARYAM": {
    "id": "L01_MAP_FAIL_02_MARYAM",
    "scene": "خطأ الربط",
    "speaker": "MARYAM",
    "trigger": "بعد عمر؛ بعدها زر العودة للمصفوفة.",
    "delivery": "Cool, incisive, mildly condescending. Underplay the accusation. Do not sound nurturing.",
    "text": "إنت مستعجل تثبت إنك فاهم، فعدّيت على اللي بيخالفك. راجع النسبة والترتيب... المرة دي من غير افتراضات.",
    "who": "mariam",
    "file": "L01_MAP_FAIL_02_MARYAM.wav"
  },
  "L01_MAP_REPEAT_01_OMAR": {
    "id": "L01_MAP_REPEAT_01_OMAR",
    "scene": "تكرار خطأ الربط",
    "speaker": "OMAR",
    "trigger": "بديل لتعليق عمر عند تكرار الخطأ، لا يضاف كعقوبة أطول.",
    "delivery": "Sharper personal challenge on a repeat failure. Quiet authority, with a deliberate pause before the final word. Never yell.",
    "text": "أنا جبت محلل يراجع أرقامنا، مش حد نقعد نراجع وراه. لو شايف إنك قدّ الكرسي ده... ورّيني.",
    "who": "omar",
    "file": "L01_MAP_REPEAT_01_OMAR.wav"
  },
  "L01_MAP_OK_01_MARYAM": {
    "id": "L01_MAP_OK_01_MARYAM",
    "scene": "الربط الصحيح",
    "speaker": "MARYAM",
    "trigger": "بعد صحة المصفوفة وقبل اختيار القرار.",
    "delivery": "Measured and challenging, acknowledging the correct mapping but withholding full approval.",
    "text": "الربط صح. بس لسه ما أثبتّش إنك تعرف تاخد قرار. الأرقام قدامك... اختار.",
    "who": "mariam",
    "file": "L01_MAP_OK_01_MARYAM.wav"
  },
  "L01_DEC_TIKTOK_01_KARIM": {
    "id": "L01_DEC_TIKTOK_01_KARIM",
    "scene": "قرار غير صحيح",
    "speaker": "KARIM",
    "trigger": "فقط إذا اختار اللاعب TikTok لأنه الأقل إنفاقًا.",
    "delivery": "A disbelieving half-smile, then pointed seriousness. He challenges a weak argument even though the choice favors him. No laughter.",
    "text": "إنت بتحلل، ولا بتجاملني؟ أنا عايز زيادة أقدر أدافع عنها، مش حد يوافقني وخلاص. قلة الصرف لوحدها مش حجة.",
    "who": "karim",
    "file": "L01_DEC_TIKTOK_01_KARIM.wav"
  },
  "L01_DEC_GOOGLE_01_SARA": {
    "id": "L01_DEC_GOOGLE_01_SARA",
    "scene": "قرار غير صحيح",
    "speaker": "SARA",
    "trigger": "فقط إذا اختار اللاعب Google لأنه صاحب أكبر إنفاق.",
    "delivery": "Dry disbelief, a cutting personal jab, then a restrained disappointed finish. Do not exaggerate sarcasm.",
    "text": "جوجل عشان صرف أكتر؟ إنت كده بتكافئ أكبر فاتورة. كنت فاكرة إنك هتضيف للمقارنة أكتر من كده.",
    "who": "sara",
    "file": "L01_DEC_GOOGLE_01_SARA.wav"
  },
  "L01_DEC_RETRY_01_MARYAM": {
    "id": "L01_DEC_RETRY_01_MARYAM",
    "scene": "قرار غير صحيح",
    "speaker": "MARYAM",
    "trigger": "بعد تعليق كريم أو سارة؛ يعود اللاعب لاختيار القرار دون مسح الربط.",
    "delivery": "Calm, uncompromising, precise. Stress changing the decision, not the correct numbers.",
    "text": "الربط صح. الغلط في الحكم اللي إنت طلعته منه. ما تغيّرش الأرقام عشان تنقذ اختيارك... غيّر اختيارك لو الأرقام ضده.",
    "who": "mariam",
    "file": "L01_DEC_RETRY_01_MARYAM.wav"
  },
  "L01_END_01_SARA": {
    "id": "L01_END_01_SARA",
    "scene": "النهاية الصحيحة",
    "speaker": "SARA",
    "trigger": "بعد اختيار Instagram؛ الحساب ظاهر على الشاشة.",
    "delivery": "A skeptical colleague finally granting respect. Clear figures, restrained approval.",
    "text": "تمام... تلاتمية عميل، بتمانين جنيه للواحد. كده عندك حجة، مش مجرد اسم منصة.",
    "who": "sara",
    "file": "L01_END_01_SARA.wav"
  },
  "L01_END_02_KARIM": {
    "id": "L01_END_02_KARIM",
    "scene": "النهاية الصحيحة",
    "speaker": "KARIM",
    "trigger": "يتراجع عن المقارنة الانتقائية، لا عن حقه في فرصة مستقبلية.",
    "delivery": "Reluctant but sincere concession. Keep his pride and competitive energy; he is not humiliated.",
    "text": "ماشي، دي ليك. إنستجرام أقل في تكلفة العميل، حتى لو تيك توك أقل في إجمالي الصرف. المرة دي الأرقام معاك.",
    "who": "karim",
    "file": "L01_END_02_KARIM.wav"
  },
  "L01_END_03_OMAR": {
    "id": "L01_END_03_OMAR",
    "scene": "النهاية الصحيحة",
    "speaker": "OMAR",
    "trigger": "يعتمد اختبارًا محدودًا، لا زيادة مضمونة النجاح.",
    "delivery": "Earned respect, controlled and decisive. Approval should feel genuine after the challenge.",
    "text": "كده أقنعتني. اختبار زيادة لإنستجرام، ونتابع التكلفة. أنا مش محتاجك توافقني... محتاجك تقنعني. ودي عملتها.",
    "who": "omar",
    "file": "L01_END_03_OMAR.wav"
  },
  "L01_END_04_MARYAM": {
    "id": "L01_END_04_MARYAM",
    "scene": "النهاية الصحيحة",
    "speaker": "MARYAM",
    "trigger": "تضع حدود الاستنتاج وتفتح موضوع الربحية.",
    "delivery": "Return to grounded strategic caution. No personal jab here; the player has earned the result.",
    "text": "متفقين. بس دي كفاءة اكتساب عميل؛ لسه ما قلناش العميل ده بيكسبنا كام.",
    "who": "mariam",
    "file": "L01_END_04_MARYAM.wav"
  },
  "L01_END_05_NADIA": {
    "id": "L01_END_05_NADIA",
    "scene": "النهاية الصحيحة",
    "speaker": "NADIA",
    "trigger": "قفلة المستوى؛ تقدم ملف المنتجات.",
    "delivery": "Practical, curious, inviting the next challenge. Slight emphasis on differing contribution, no ominous narration.",
    "text": "حلو. نقدر نفتح الملف اللي بعده؟ العملاء اشتروا كورسات مختلفة... ومش كل كورس ساب لنا نفس المكسب.",
    "who": "nadia",
    "file": "L01_END_05_NADIA.wav"
  }
};
const all=Object.values(clips),l=root.DM_DATA.levels[0];
const group=scene=>all.filter(c=>c.scene===scene);
l.intro=group('الافتتاحية').map(c=>[c.who,c.text]);
l.success=group('النهاية الصحيحة').map(c=>[c.who,c.text]);
l.hints=group('تلميحات اختيارية').map(c=>c.text);
l.meeting.handoffText=clips.L01_HANDOFF_01_NADIA.text;
l.meeting.dialogueEvidence={1:'karim',2:'sara',4:'nadia',5:'mariam'};
l.meeting.reactionRounds=[[clips.L01_MAP_FAIL_01_OMAR,clips.L01_MAP_FAIL_02_MARYAM],[clips.L01_MAP_REPEAT_01_OMAR,clips.L01_MAP_FAIL_02_MARYAM]];
root.DM_LEVEL01_VOICES={clips,group,reactionLines(current){return current.solved?[current.choice===2?clips.L01_DEC_TIKTOK_01_KARIM:clips.L01_DEC_GOOGLE_01_SARA,clips.L01_DEC_RETRY_01_MARYAM]:l.meeting.reactionRounds[Math.min(Math.max((current.mapAttempts||current.attempts||1)-1,0),1)];}};
})(typeof window!=='undefined'?window:globalThis);
