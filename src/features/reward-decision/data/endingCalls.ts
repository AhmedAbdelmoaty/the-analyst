import { v, type Gender, type GenderText } from '@/lib/genderText';
import type { Level1Decision } from './case';
import { renderLines, type Line, type SourceLine, type Speaker } from './script';

export interface EndingCall {
  caller: Extract<Speaker, 'mahmoud' | 'marwan' | 'sherif'>;
  lines: Line[];
}

const L = (id: string, speaker: Speaker, text: GenderText): SourceLine => ({ id, speaker, text });

const CALLS: Record<Level1Decision, readonly [
  { caller: EndingCall['caller']; lines: SourceLine[] },
  { caller: EndingCall['caller']; lines: SourceLine[] },
]> = {
  marwan: [
    { caller: 'marwan', lines: [
      L('marwan_win_01', 'marwan', 'أخيرًا رديت يا عم! متشكرين على الخدمة دي تسلم يا كبير، الجميل ده مش هيتنسي ليك عندي عزومة كبيرة.'),
      L('marwan_win_02', 'player', 'ألف مبروك يا مروان، بس جميل إيه؟! دي مراجعة أرقام مش خدمة لحد.'),
      L('marwan_win_03', 'marwan', ['يا عم خدمة ولا مراجعة، المهم إنك ظبطت الدنيا ومشيتها، هروح أفرح الشباب بقى.. ', v('سلام يا نجم!', 'سلام يا نجمة!')]),
    ] },
    { caller: 'mahmoud', lines: [
      L('marwan_loss_mahmoud_01', 'mahmoud', 'إيه اللي أنا سمعته ده؟! مروان اتكرّم؟! هو إنت كنت بتقرأ الأرقام ولا بتتفرج عليها؟! إنت فاهم إحصاء أصلًا؟!'),
      L('marwan_loss_mahmoud_02', 'player', 'يا محمود، أنا بصيت على الأرقام وقدمت اللي وصلت له—'),
      L('marwan_loss_mahmoud_03', 'mahmoud', 'وصلت لإيه بس؟! فريق شغال طول الشهر وحقه يضيع.. إنت ولا فاهم إحصا ولا أي حاجة، إنت قاصد تخدم مروان!'),
    ] },
  ],
  mahmoud: [
    { caller: 'mahmoud', lines: [
      L('mahmoud_win_01', 'mahmoud', [v('إنت فين يا نجم؟! ', 'إنتِ فين يا نجمة؟! '), 'التكريم نزل والناس عندي قالبين المكتب هيصة! تسلم إيدك إنك ما استسهلتش.']),
      L('mahmoud_win_02', 'player', 'ألف مبروك يا محمود، تستاهلوا كل خير، وسلّم لي على الشباب كلهم.'),
      L('mahmoud_win_03', 'mahmoud', [v('الله يبارك فيك يا غالي!', 'الله يبارك فيكِ يا غالية!'), ' الناس دي تعبت والنهارده حسّوا إن تعبهم ماراحش هدر.. هقفل قبل ما يعملوا زفة في المكتب، ', v('سلام يا نجم!', 'سلام يا نجمة!')]),
    ] },
    { caller: 'marwan', lines: [
      L('mahmoud_loss_marwan_01', 'marwan', [v('معلش، فهمني بقى… ', 'معلش، فهميني بقى… '), 'إحنا نجيب أعلى متوسط، وفي الآخر التكريم يروح لمحمود؟! طب الـ95% دي أعمل بيها إيه، أعلّقها برواز في المكتب؟!']),
      L('mahmoud_loss_marwan_02', 'player', 'أنا قدمت المراجعة بالأسباب اللي وصلت لها، والقرار اتبنى عليها.'),
      L('mahmoud_loss_marwan_03', 'marwan', [v('هراجعه وهتكلم مع حسام وشريف كمان! بس بصراحة إنت قلبتلي اليوم كله على دماغي.. سلام!', 'هراجعه وهتكلم مع حسام وشريف كمان! بس بصراحة إنتِ قلبتيلي اليوم كله على دماغي.. سلام!')]),
    ] },
  ],
  defer: [
    { caller: 'marwan', lines: [
      L('defer_marwan_01', 'marwan', 'يا أخي حرام عليك! ليه العكننة دي بس؟! ده التورتة كانت في الأسانسير والناس مستنية تفرح! هو إنت هوايتك توقف المراكب السايرة؟! بقى نفضل معلقين كده ومحدش عارف ياخد مليم؟!'),
      L('defer_marwan_02', 'player', 'يا مروان الموضوع مش عكننة، الأرقام فيها تباين كبير وسياسة الشركة بتشترط أداء جماعي، مينفعش نعتمد قرار ظالم.'),
      L('defer_marwan_03', 'marwan', 'ظالم إيه بس وإحنا 95%؟! عمومًا أنا مش هسكت، هروح لحسام وشريف ونشوف حكاية التأجيل دي.. سلام!'),
    ] },
    { caller: 'sherif', lines: [
      L('defer_sherif_01', 'sherif', [v('الله ينور عليك.. ', 'الله ينور عليكِ.. '), 'قرارك بالتأجيل كان في محله، وموقف سليم يمنع أي ظلم في الشركة.']),
      L('defer_sherif_02', 'player', 'شكراً يا فندم، المتوسط والوسيط لوحدهم مكنوش كافيين نحكم بيهم على أداء الفريقين.'),
      L('defer_sherif_03', 'sherif', 'بالظبط، وده الصح. راجع بياناتك براحتك ولما الصورة تكتمل هنقعد تاني ونحسم القرار النهائي.'),
    ] },
  ],
};

/** Booleans retain the old meaning: true awarded Mahmoud, false awarded Marwan. */
export function endingCalls(decision: Level1Decision | boolean, gender: Gender): [EndingCall, EndingCall] {
  const resolved: Level1Decision = typeof decision === 'boolean' ? (decision ? 'mahmoud' : 'marwan') : decision;
  return CALLS[resolved].map(call => ({ caller: call.caller, lines: renderLines(call.lines, gender) })) as [EndingCall, EndingCall];
}
