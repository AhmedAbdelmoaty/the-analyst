import { renderGenderText, v, type Gender } from '@/lib/genderText';
import type { Evaluation, FinalReport } from '../engine/model';
import type { Line, Speaker } from './script';

export interface EndingCall {
  caller: Extract<Speaker, 'mahmoud' | 'marwan'>;
  lines: Line[];
}

const line = (id: string, speaker: Speaker, text: string): Line => ({ id, speaker, text });
const playerLine = (id: string, parts: Parameters<typeof renderGenderText>[0], gender: Gender): Line =>
  line(id, 'player', renderGenderText(parts, gender));

export function endingCalls(report: FinalReport, evaluation: Evaluation, gender: Gender): [EndingCall, EndingCall] {
  if (report.teamId === 'marwan') {
    return [
      {
        caller: 'mahmoud',
        lines: [
          line('call_marwan_mahmoud_01', 'mahmoud', 'هو إيه اللي حصل ده؟! إنت رشّحت فريق مروان؟ أمال كشوف الناس اللي كانت قدامك دي عملت بيها إيه؟'),
          playerLine('call_marwan_mahmoud_02', ['يا محمود، استنى بس، أنا ', v('راجعت', 'راجعت'), ' النتائج قبل ما أقدم التقرير.'], gender),
          line('call_marwan_mahmoud_03', 'mahmoud', renderGenderText(['راجعت إيه؟! فريقي كله عامل المطلوب منه، وفي الآخر يطلع كأنه ما عملش حاجة! لو كام واحد شايلين نتيجة فريق كامل وإنت مش ', v('شايف', 'شايفة'), ' ده، يبقى إنت ', v('فاهم', 'فاهمة'), ' الإحصاء غلط. وقرارك ده ناس تعبت هي اللي هتدفع تمنه!'], gender)),
        ],
      },
      {
        caller: 'marwan',
        lines: [
          line('call_marwan_marwan_01', 'marwan', 'يا سلام عليك! حسام قالّي القرار خلاص اتعتمد. إنت كده ظبطتني، أنا كنت قلقان الموضوع يقف عند داليا.'),
          playerLine('call_marwan_marwan_02', [v('ظبطتك؟', 'ظبطتك؟'), ' أنا قدمت توصية، مش بعمل خدمة لحد.'], gender),
          line('call_marwan_marwan_03', 'marwan', 'يا عم توصية، خدمة… المهم المكافأة جت! بس حكاية إن كام واحد شايلين الباقي دي خلّيها بينّا. مش ناقصين حد يفتح الكلام ده دلوقتي. تسلم لي!'),
        ],
      },
    ];
  }

  const supported = evaluation.outcome === 'supported';
  return [
    {
      caller: 'mahmoud',
      lines: [
        line('call_mahmoud_mahmoud_01', 'mahmoud', 'إنت لو شفت الناس هنا دلوقتي! أول ما عرفوا القرار المكتب كله قلب. أخيرًا حسّوا إن تعبهم اتشاف.'),
        playerLine('call_mahmoud_mahmoud_02', ['مبروك يا محمود. سلّم لي عليهم، يستاهلوا يفرحوا.'], gender),
        line(
          supported ? 'call_mahmoud_supported_03' : 'call_mahmoud_unsupported_03',
          'mahmoud',
          supported
            ? 'الله يبارك فيك. أنا كنت خايف الرقم الكبير يخطف عينك زي ما خطف عين الكل. بس إنت بصّيت كويس، وما ضيّعتش حق الناس. شكرًا بجد.'
            : 'الله يبارك فيك. الناس كانت مستنية القرار ده من زمان. هسيبك دلوقتي وأروح أقول لهم بنفسي.',
        ),
      ],
    },
    {
      caller: 'marwan',
      lines: [
        line('call_mahmoud_marwan_01', 'marwan', 'يعني إيه التكريم يروح لمحمود؟! إحنا أعلى متوسط، والناس كانت مستنية القرار. أنا أروح أقول لهم إيه دلوقتي؟'),
        playerLine(
          supported ? 'call_mahmoud_supported_marwan_02' : 'call_mahmoud_unsupported_marwan_02',
          supported
            ? ['قول لهم إن شغلهم اتراجع كله، مش الرقم الكبير بس. وأنا قدمت اللي شفته.']
            : ['ده اللي وصلت له من المقارنة، وكتبته في التقرير.'],
          gender,
        ),
        line(
          supported ? 'call_mahmoud_supported_marwan_03' : 'call_mahmoud_unsupported_marwan_03',
          'marwan',
          supported
            ? 'ماشي… واضح إن التقرير المختصر ما عدّاش معاك. أنا كنت فاكر الموضوع خلص من بدري. كده لازم أقعد مع حسام وأشوف هنعمل إيه مع باقي الفريق.'
            : 'طب أنا شفت التقرير، ولسه مش فاهم إيه اللي حسم الاختيار. إنت رشّحت فريق محمود، بس الكلام اللي كاتبه مش موضّح لي ليه. وأنا لازم أرجع للناس برد واضح.',
        ),
      ],
    },
  ];
}