import { genderLine, v, type GenderText } from "@/lib/genderText";

// ============================================================
// Case Tree — Spine (S1..S5) + Topic Pools for wrong tracks (A/C/D)
// ============================================================
// Spine nodes use fixed correct/wrong options.
// Wrong tracks (A/C/D) use TOPIC POOLS — engine picks 2 unasked
// topics each round, so no question repeats and the order changes
// based on what the player picks.
// ------------------------------------------------------------

export type SpineNodeId = "S1" | "S2" | "S3" | "S4" | "S5" | "END";
export type NodeId = SpineNodeId | "ON_TRACK";

export type TrackId = "A" | "C" | "D";

export type CaseOutcome = "strong" | "weak";

export interface CaseNoteCandidate {
  id: string;
  text: string;
}

export interface CaseQuestionOption {
  text: GenderText;
  hishamReply: GenderText;
  evidenceId?: string;
  note?: CaseNoteCandidate;
}

export interface SpineNode {
  id: SpineNodeId;
  context?: string;
  correct: CaseQuestionOption;
  wrong: CaseQuestionOption;
  nextOnCorrect: SpineNodeId;
  /** When wrong is chosen, player enters this track (or END) */
  nextOnWrong: SpineNodeId | "ON_TRACK";
  /** Track to enter when wrong is chosen */
  wrongEntersTrack?: TrackId;
  /** Optional: which topic in the track is auto-skipped because the wrong question already covered it */
  wrongConsumesTopicId?: string;
}

/** A single inquiry topic inside a wrong track */
export interface TrackTopic {
  id: string;
  text: GenderText;
  hishamReply: GenderText;
  evidenceId?: string;
  note?: CaseNoteCandidate;
}

/** A wrong track is a pool of topics + a final "conclusion" option */
export interface TrackPool {
  id: TrackId;
  topics: TrackTopic[];
  /** Final wrap-up shown when player has exhausted topics or reaches last question */
  conclusion: TrackTopic;
}

// ============================================================
// SPINE — unchanged narrative on the correct path
// ============================================================

export const SPINE: Record<SpineNodeId, SpineNode> = {
  S1: {
    id: "S1",
    context: "البداية: أستاذ هشام قاعد قدامك، حاطط إيده على راسه. لسه ما قال أرقام ولا سنين.",
    correct: {
      text: "خلينا نبدأ من الأول يا أستاذ هشام. إيه اللي خلاك تحس إن في مشكلة؟ حصل إيه بالظبط في الشهر ده؟",
      hishamReply:
        "والله يا فندم، المحل فيه حركة كويسة. بس في آخر الشهر لما قعدت أبصّ على التقارير، لقيت المبيعات قليلة، الرقم اللي طالعلي أقل من المتوقّع.",
      note: {
        id: "n_s1_problem_open",
        text: "أستاذ هشام حاسس إن مبيعات الشهر مش زي ما هو متوقّع.",
      },
    },
    wrong: {
      text: "أستاذ هشام، عندي إحساس إن المشكلة دي غالبًا من فريق البيع. يمكن مش بيتحركوا زي الأول. ممكن نبص على شغلهم الأول؟",
      hishamReply:
        "والله ممكن يا فندم. الفريق عندي من زمان، بس فعلاً ممكن يكونوا قصروا في حاجة. خلينا نبص ونشوف.",
      note: {
        id: "n_s1_jump_internal",
        text: "اقتراح إن المشكلة ممكن تكون من فريق البيع.",
      },
    },
    nextOnCorrect: "S2",
    nextOnWrong: "ON_TRACK",
    wrongEntersTrack: "A",
  },

  S2: {
    id: "S2",
    context: "أستاذ هشام قال 'أقل من المتوقع' — محتاج تفهم: متوقّع مقارنةً بإيه؟",
    correct: {
      text: "طب خلينا نقف هنا. لما بتقول المبيعات أقل من المتوقع، ممكن تقولي قلت بنسبة قد ايه وحضرتك بتقارن بإيه؟ ",
      hishamReply:
        "أنا قارنت بنفس الشهر السنة اللي فاتت، فبراير 2025. لقيت فبراير السنة دي أقل بحوالي 30%. الرقم ده بالنسبالي كبير، مش حاجة أقدر أعديها.",
      note: {
        id: "n_s2_baseline_one_year",
        text: "أستاذ هشام بيقارن مبيعات فبراير 2026 بفبراير 2025.",
      },
    },
    wrong: {
      text: "تمام، ممكن أبص على تقرير مبيعات الشهر ده؟ خلينا نشوف الأرقام الأول.",
      hishamReply:
        " ده تقرير المبيعات اليومية للشهر ده. هتلاقي أيام الحركة فيها كويسة، وأيام تانية أهدى شوية.",
      evidenceId: "ev_daily_sales",
      note: {
        id: "n_s2_jumped_to_data",
        text: " يوجد تذبذب في ارقام المبيعات خلال ايام الشهر بعض الأيام حركة كويسة وبعضها ضعيف.",
      },
    },
    nextOnCorrect: "S3",
    nextOnWrong: "ON_TRACK",
    wrongEntersTrack: "D",
  },

  S3: {
    id: "S3",
    context: "عرفت إنه بيقارن بسنة وحدة. محتاج تشوف المقارنة دي على ورق.",
    correct: {
      text: "طب ممكن أشوف تقارير المبيعات الخاصة بالسنتين؟",
      hishamReply: genderLine([
        "أنا طلبت من المحاسبة تطبعلي التقرير لما بدأت أقلق. ",
        v("اتفضل", "اتفضلي"),
        "، ",
        v("خد", "خدي"),
        " التقرير ده و",
        v("بص", "بصي"),
        " بنفسك.",
      ]),
      evidenceId: "ev_year_vs_year",
      note: {
        id: "n_s3_chart1_confirmed",
        text: "تقرير المحاسبة (فبراير 2025 vs فبراير 2026) في الدفتر — الفرق واضح بالأرقام.",
      },
    },
    wrong: {
      // Pure competitors framing — no marketing/campaign mention
      text: "طب قبل ما نكمل، المنافسين حواليك بيعملوا إيه دلوقتي؟ ممكن السوق بقى أصعب.",
      hishamReply:
        "المنافسة بقت أقوى شوية الفترة دي. المحلات حواليّا بقت بتعمل عروض وخصومات كتير. ده تقرير ملخص عروض المنافسين.",
      evidenceId: "ev_competitor_offers",
      note: {
        id: "n_s3_jumped_external",
        text: "المنافسين عاملين عروض مختلفة وخصومات كتير والمنافسة قوية.",
      },
    },
    nextOnCorrect: "S4",
    nextOnWrong: "ON_TRACK",
    wrongEntersTrack: "C",
    // S3 wrong already showed competitor offers report — skip that topic in track C
    wrongConsumesTopicId: "c_competitor_offers",
  },

  S4: {
    id: "S4",
    context: "التقرير عرض سنة واحدة بس. السنة دي طبيعية ولا استثنائية؟",
    correct: {
      text: "حضرتك بتقارن بسنة واحدة بس. ممكن نشوف مبيعات فبراير لآخر 3 سنين؟ عشان نعرف هل سنة 2025 كانت طبيعية ولا لأ؟",
      hishamReply: genderLine([
        "مفيش مشكلة. خليني أطلب التقرير من المحاسبة… ",
        v("اتفضل", "اتفضلي"),
        " ده التقرير. ",
        v("شوف", "شوفي"),
        " بنفسك.",
      ]),
      evidenceId: "ev_three_year",
      note: {
        id: "n_s4_chart2_anomaly",
        text: "تقرير 3 سنين في الدفتر — سنة 2025 واضح إنها مختلفة عن 2024 و2026.",
      },
    },
    wrong: {
      text: "إيه طبيعة العروض اللي بيقدمها المنافسين دلوقتي؟",
      hishamReply: genderLine([v("اتفضل", "اتفضلي"), ". ده تقرير فيه العروض والخصومات من المحلات اللي حوالينا."]),
      evidenceId: "ev_competitor_offers",
      note: {
        id: "n_s4_jumped_external",
        text: "المنافسين عاملين عروض مختلفة وخصومات كتير والمنافسة قوية.",
      },
    },
    nextOnCorrect: "S5",
    nextOnWrong: "ON_TRACK",
    wrongEntersTrack: "C",
    wrongConsumesTopicId: "c_competitor_offers",
  },

  S5: {
    id: "S5",
    context: "التقرير وضّح إن سنة 2025 طالعة عن الباقي. ليه؟ محتاج تفكيك للرقم.",
    correct: {
      text: "ممكن أشوف تقرير تفصيلي للمبيعات مش بس رقم اجمالي؟",
      hishamReply: genderLine(["آه طبعًا، عندي تقرير بيقسّم المبيعات. ", v("اتفضل", "اتفضلي"), "."]),
      evidenceId: "ev_breakdown",
      note: {
        id: "n_s5_truth",
        text: "تقرير التفكيك في الدفتر — كشف إن سنة 2025 دخلت لها تحويلات استثنائية من فروع أخرى.",
      },
    },
    wrong: {
      text: " طب ممكن نبص على أداء الحملات الإعلانية الأخيرة؟ لأن انا شاكك ان هي السبب.",
      hishamReply: genderLine([v("اتفضل", "اتفضلي"), " يا فندم، ده تقرير التسويق بتاع السنة دي والسنة اللي فاتت. هتلاقي فيه الميزانية والأرقام."]),
      evidenceId: "ev_marketing",
      note: {
        id: "n_s5_jumped_marketing",
        text: "تقرير التسويق في الدفتر — ميزانية وحملات أقل عن السنة اللي فاتت.",
      },
    },
    nextOnCorrect: "END",
    nextOnWrong: "ON_TRACK",
    wrongEntersTrack: "D",
    // S5 wrong already showed the marketing report — skip that topic in track D
    wrongConsumesTopicId: "d_marketing_report",
  },

  END: {
    id: "END",
    correct: { text: "", hishamReply: "" },
    wrong: { text: "", hishamReply: "" },
    nextOnCorrect: "END",
    nextOnWrong: "END",
  },
};

// ============================================================
// TRACKS — Topic pools (shown 2-at-a-time, never repeating)
// ============================================================

export const TRACKS: Record<TrackId, TrackPool> = {
  // -------- TRACK A — Sales team --------
  A: {
    id: "A",
    topics: [
      {
        id: "a_team_performance",
        text: "ممكن أشوف تقرير بأداء كل واحد في فريق المبيعات؟",
        hishamReply: genderLine(["أكيد يا فندم. ", v("اتفضل", "اتفضلي"), "، ده التقرير. هتلاقي في فروق بين الأفراد."]),
        evidenceId: "ev_team_performance",
        note: {
          id: "n_a_perf",
          text: "تقرير أداء البائعين في الدفتر — كريم الأعلى، هاني الأقل.",
        },
      },
      {
        id: "a_team_conversion",
        text: "طب ممكن نبص على نسبة التحويل لكل فرد في الفريق؟",
        hishamReply:
          "ده تقرير فيه نسبة التحويل لكل فرد داخل الفريق.",
        evidenceId: "ev_team_conversion",
        note: {
          id: "n_a_conv",
          text: "تقرير نسب التحويل في الدفتر — فروق واضحة بين البائعين.",
        },
      },
      {
        id: "a_team_training",
        text: "في تدريب أو متابعة منتظمة بتعملها للفريق؟ آخر تدريب كان امتى؟",
        hishamReply:
          "بصراحة يا فندم… آخر تدريب عملته للفريق بقاله سنة. والمتابعة اليومية مش منتظمة أوي.",
        note: {
          id: "n_a_train",
          text: "أستاذ هشام بيقول ان أخر تدريب كان من سنة، والمتابعة مش منتظمة.",
        },
      },
    ],
    conclusion: {
      id: "a_conclude",
      text: "تمام، الصورة بقت أوضح. فيه ضعف تنفيذ ومتابعة من ناحية الفريق.",
      hishamReply:
        "تمام يا فندم… انا كده شوفت الصورة بالكامل، شكرا جدا.",
      note: {
        id: "n_a_conclude",
        text: "السبب هو ضعف فريق المبيعات، استاذ هشام مقتنع وهياخد خطوات.",
      },
    },
  },

  // -------- TRACK C — Competitors / pricing (NO marketing) --------
  C: {
    id: "C",
    topics: [
      {
        id: "c_competitor_offers",
        text: "إيه طبيعة العروض اللي بيقدمها المنافسين دلوقتي؟",
        hishamReply: genderLine([v("اتفضل", "اتفضلي"), " يا فندم، ده اللي جمعته من حوالينا. أكتر حاجة شايفها خصومات وعروض 2+1 على بعض الموديلات."]),
        evidenceId: "ev_competitor_offers",
        note: { id: "n_c_offers", text: "المنافسين عاملين عروض مختلفة وخصومات كتير والمنافسة قوية." },
      },
      {
        id: "c_customer_price_feedback",
        text: "فيه زباين عندك بيشتكوا من السعر مقارنة بالسوق؟",
        hishamReply:
          "بعض الزباين فعلاً اشتكوا من أسعار بعض الموديلات، أو سألوا على خصم، بس مش كلهم. ده ملف فيه ملاحظات الزباين الفترة الأخيرة.",
        evidenceId: "ev_customer_feedback",
        note: {
          id: "n_c_feedback",
          text: "ملاحظات العملاء — بعض الزباين بيشتكوا من أسعار بعض الموديلات.",
        },
      },
      {
        id: "c_price_response",
        text: "نعمل رد سعري تنافسي. عرض محدد لفترة قصيرة على خط معين؟",
        hishamReply:
          "ممكن يا فندم، عرض محدود على خط معين يبقى أفضل من خصم عام.",
        note: {
          id: "n_c_response",
          text: "اقتراح عرض محدود على خط معين — أستاذ هشام موافق.",
        },
      },
    ],
    conclusion: {
      id: "c_conclude",
      text: "كده الصورة بقت أوضح، السوق بيضغط على السعر ومحتاجين تحرك سعري.",
      hishamReply:
        "تمام يا فندم… كلام منطقي وهنبدأ ناخد خطوة الخصومات والعروض. شكرا جدا.",
      note: {
        id: "n_c_conclude",
        text: "السبب هو المنافسة الشديدة وضغط السوق، استاذ هشام مقتنع وهياخد خطوات",
      },
    },
  },

  // -------- TRACK D — Marketing / demand (NO competitors) --------
  D: {
    id: "D",
    topics: [
      {
        id: "d_active_campaign",
        text: "هل في أي حملة تنشيط أو ترويج كانت شغالة الشهر ده؟",
        hishamReply:
          "لأ يا فندم، مفيش حملة تنشيط مخصصة اتعملت الشهر ده. بس في إعلانات عادية شغالة طول الوقت بميزانية أقل.",
        note: {
          id: "n_d_campaign",
          text: "مفيش حملة تنشيط الشهر ده، عكس السنة اللي فاتت.",
        },
      },
      {
        id: "d_new_vs_returning",
        text: "طب البيع الشهر ده جاي أكتر من الإعلانات الأونلاين، ولا من زيارات المحل؟",
        hishamReply:
          "الأونلاين أهدى شوية… بس لسه في بيع جاي منه، وكمان في ناس بتيجي المحل.",
        note: {
          id: "n_d_new_customers",
          text: "البيع أونلاين أهدى، لكن فيه مبيعات جايه منه، وفي زباين بتيجي المحل.",
        },
      },
      {
        id: "d_marketing_report",
        text: "ممكن نبص على ملخص أداء التسويق السنة دي مقارنة بالسنة اللي فاتت؟",
        hishamReply: genderLine([v("اتفضل", "اتفضلي"), " يا فندم. ده تقرير التسويق بميزانية وأرقام السنتين جنب بعض."]),
        evidenceId: "ev_marketing",
        note: {
          id: "n_d_marketing",
          text: "تقرير التسويق في الدفتر — ميزانية وحملات أقل عن السنة اللي فاتت.",
        },
      },
    ],
    conclusion: {
      id: "d_conclude",
      text: "يبقى محتاجين حملة تنشيط مدروسة قبل الموسم الجاي، بميزانية محسوبة.",
      hishamReply:
        "كلام منطقي يا فندم. الصورة دلوقتي بقت أوضح... التسويق أكيد له تأثير كبير.",
      note: {
        id: "n_d_conclude",
        text: "السبب هو ضعف التسويق والحملات الموسمية، استاذ هشام مقتنع.",
      },
    },
  },
};

export const TOTAL_QUESTION_BUDGET = 5;
