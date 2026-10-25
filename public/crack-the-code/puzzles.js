/* Crack the Code — 3-Digit Puzzle System
   Unified Levels Data Source
   Level 1: 352 (Very Easy - Office Vault)
   Level 2: 583 (Medium - Archive Vault)
   Level 3: 946 (Hard - Main Vault)
*/

const PUZZLES = [
  {
    levelId: "office-vault",
    id: "office-vault",
    level: 1,
    levelName: "Office vault",
    levelNameAr: "خزنة المكتب",
    difficulty: "Very Easy",
    difficultyAr: "سهل جداً",
    skill: "Very Easy · Beginner deduction",
    skillAr: "سهل جداً · استبعاد مباشر",
    codeLength: 3,
    length: 3,
    correctCode: [3, 5, 2],
    secret: [3, 5, 2],
    clues: [
      {
        digits: [7, 8, 9],
        exact: 0,
        misplaced: 0,
        textAr: "ولا رقم موجود في الشفرة.",
        textEn: "None of these digits is in the code."
      },
      {
        digits: [3, 4, 1],
        exact: 1,
        misplaced: 0,
        textAr: "رقم واحد صح وفي مكانه، والباقي مش موجود.",
        textEn: "One digit is correct and well placed, the rest are not present."
      },
      {
        digits: [5, 0, 6],
        exact: 0,
        misplaced: 1,
        textAr: "رقم واحد صح بس مش في مكانه، والباقي مش موجود.",
        textEn: "One digit is correct but misplaced, the rest are not present."
      },
      {
        digits: [2, 4, 5],
        exact: 0,
        misplaced: 2,
        textAr: "رقمين صح بس مش في مكانهم، والباقي مش موجود.",
        textEn: "Two digits are correct but misplaced, the rest are not present."
      }
    ],
    hints: [
      {
        ar: "ابدأ بالدليل اللي بيقول إن فيه رقم صح وفي مكانه، وشوف تقدر تثبت إيه.",
        en: "Start with the clue that says a digit is correct and well placed, and see what you can prove."
      },
      {
        ar: "الرقم 3 في أول خانة! كده فاضلك رقمين بس.",
        en: "Digit 3 is in the first position! Now only two digits left."
      },
      {
        ar: "الرقم 5 مكانه في النص. استخدم الدليل الرابع عشان تكمل آخر خانة.",
        en: "Digit 5 is in the middle. Use the fourth clue to complete the last position."
      }
    ],
    successMessage: {
      ar: "جامد جداً! فتحنا أول خزنة، خلّينا ندخل على التانية قبل ما وقتنا يخلص!",
      en: "Bravo! The first vault is open. Let's move on to the second before time runs out!"
    }
  },
  {
    levelId: "archive-vault",
    id: "archive-vault",
    level: 2,
    levelName: "Archive vault",
    levelNameAr: "خزنة الأرشيف",
    difficulty: "Medium",
    difficultyAr: "متوسط",
    skill: "Medium · Position analysis",
    skillAr: "متوسط · ركّز في أماكن الأرقام",
    codeLength: 3,
    length: 3,
    correctCode: [5, 8, 3],
    secret: [5, 8, 3],
    clues: [
      {
        digits: [1, 0, 4],
        exact: 0,
        misplaced: 0,
        textAr: "ولا رقم موجود في الشفرة.",
        textEn: "None of these digits is in the code."
      },
      {
        digits: [2, 3, 5],
        exact: 0,
        misplaced: 2,
        textAr: "رقمين صح بس مش في مكانهم، والباقي مش موجود.",
        textEn: "Two digits are correct but misplaced, the rest are not present."
      },
      {
        digits: [8, 5, 6],
        exact: 0,
        misplaced: 2,
        textAr: "رقمين صح بس مش في مكانهم، والباقي مش موجود.",
        textEn: "Two digits are correct but misplaced, the rest are not present."
      },
      {
        digits: [3, 8, 9],
        exact: 1,
        misplaced: 1,
        textAr: "رقم صح في مكانه، ورقم تاني صح بس مش في مكانه، والباقي مش موجود.",
        textEn: "One digit is well placed, another is correct but misplaced, the rest are not present."
      }
    ],
    hints: [
      {
        ar: "فيه دليل هنا مش بيديك أرقام صح خالص، بالعكس... بيساعدك تستبعد احتمالات كتير. ابدأ منه، وبعدها قارن الأدلة اللي فيها أرقام صح بس في أماكن غلط.",
        en: "There is a clue here with zero correct digits; it helps eliminate many possibilities. Start there, then compare clues with misplaced digits."
      },
      {
        ar: "خد بالك من الرقم 5... الرقم ده موجود فعلًا في الشفرة! بس لسه محتاج تعرف مكانه الصح.",
        en: "Notice digit 5... it is definitely in the code! But you still need to find its correct position."
      },
      {
        ar: "هسهلهالك أكتر: الرقم 8 مكانه في النص. دلوقتي فاضلك ترتب الرقمين التانيين. ارجع للدليل التاني وشوف مين فيهم مينفعش يكون في الخانة الأخيرة.",
        en: "To make it easier: digit 8 is in the middle. Now order the other two. Look at clue 2 to see which cannot be in the last position."
      }
    ],
    successMessage: {
      ar: "يا سلام! ملف الحسابات معانا، ومنه هنقدر نفتح آخر خزنة!",
      en: "Excellent! The accounts file is with us, and from it we can open the final vault!"
    }
  },
  {
    levelId: "main-vault",
    id: "main-vault",
    level: 3,
    levelName: "Main vault",
    levelNameAr: "الخزنة الرئيسية",
    difficulty: "Hard",
    difficultyAr: "صعب",
    skill: "Hard · Constraint solving",
    skillAr: "صعب · اربط كل الأدلة ببعض",
    codeLength: 3,
    length: 3,
    correctCode: [9, 4, 6],
    secret: [9, 4, 6],
    clues: [
      {
        digits: [1, 2, 0],
        exact: 0,
        misplaced: 0,
        textAr: "ولا رقم موجود في الشفرة.",
        textEn: "None of these digits is in the code."
      },
      {
        digits: [4, 9, 8],
        exact: 0,
        misplaced: 2,
        textAr: "رقمين صح بس مش في مكانهم، والباقي مش موجود.",
        textEn: "Two digits are correct but misplaced, the rest are not present."
      },
      {
        digits: [6, 3, 4],
        exact: 0,
        misplaced: 2,
        textAr: "رقمين صح بس مش في مكانهم، والباقي مش موجود.",
        textEn: "Two digits are correct but misplaced, the rest are not present."
      },
      {
        digits: [7, 5, 9],
        exact: 0,
        misplaced: 1,
        textAr: "رقم واحد صح بس مش في مكانه، والباقي مش موجود.",
        textEn: "One digit is correct but misplaced, the rest are not present."
      },
      {
        digits: [9, 6, 5],
        exact: 1,
        misplaced: 1,
        textAr: "رقم صح في مكانه، ورقم تاني صح بس مش في مكانه، والباقي مش موجود.",
        textEn: "One digit is well placed, another is correct but misplaced, the rest are not present."
      }
    ],
    hints: [
      {
        ar: "المرة دي محتاج تربط الأدلة ببعض. أي رقم صح بس في مكان غلط، تقدر تستبعد مكانه اللي مكتوب قدامك. حاول تسجل الأماكن المستبعدة لكل رقم.",
        en: "This time connect the clues. Any correct but misplaced digit can be eliminated from that position. Track excluded positions for each digit."
      },
      {
        ar: "ركز على الدليل الرابع... الرقم الوحيد الموجود منه هو 9. يعني 7 و5 مش موجودين خالص في الشفرة.",
        en: "Focus on clue 4... the only present digit is 9. That means 7 and 5 are not in the code at all."
      },
      {
        ar: "انت قربت جدًا! الرقم 9 في أول خانة، والرقم 4 موجود برضه، بس مش في الخانة الأخيرة. استخدم الدليل الثالث عشان تعرف مين هيكمل الكود.",
        en: "You're so close! Digit 9 is in the first position, and 4 is present too, but not in the last position. Use clue 3 to finish the code."
      }
    ],
    successMessage: {
      ar: "عاااش يا وحش! خلينا نلحق الاجتماع بسرررعة!",
      en: "Bravo, beast! Let's rush to the meeting right away!"
    }
  }
];

if (typeof globalThis !== 'undefined') {
  globalThis.PUZZLES = PUZZLES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PUZZLES };
}
