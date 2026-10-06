export type TeamId = 'marwan' | 'mahmoud';
export type EvidenceId = 'ev_mean' | 'ev_median' | 'ev_range' | 'ev_sd' | 'ev_iqr' | 'ev_threshold';
export type ClaimId = 'aggregate' | 'middle' | 'spread' | 'coverage';
export type Outcome = 'supported' | 'insufficient' | 'criterion_mismatch';
export const TEAMS: Record<TeamId, {name:string; members:{id:string;name:string;value:number}[]}> = {
  marwan:{name:'فريق مروان',members:[['m01','عمرو',72],['m02','باسم',75],['m03','تامر',78],['m04','خالد',80],['m05','زياد',82],['m06','سيف',84],['m07','طارق',99],['m08','عادل',112],['m09','كريم',119],['m10','وليد',149]].map(([id,name,value])=>({id:String(id),name:String(name),value:Number(value)}))},
  mahmoud:{name:'فريق محمود',members:[['b01','أحمد',85],['b02','إيهاب',86],['b03','رامي',87],['b04','سامح',87],['b05','شادي',88],['b06','عمر',88],['b07','فادي',89],['b08','محمد',89],['b09','هاني',90],['b10','يوسف',91]].map(([id,name,value])=>({id:String(id),name:String(name),value:Number(value)}))},
};
export const POLICY='يُعد الفرد محققًا لمعيار الأداء عند بلوغ 85% من مستهدفه أو أكثر. يراعي تكريم الأداء الجماعي انتشار تحقيق المعيار بين أفراد الفريق وتقارب نتائجهم.';
export const CLAIMS:Record<ClaimId,string>={aggregate:'النتيجة الإجمالية للفريق',middle:'أداء منتصف الفريق',spread:'تقارب النتائج بين الأفراد',coverage:'انتشار تحقيق معيار الأداء'};
export const EVIDENCE:Record<EvidenceId,{title:string;action:string;meaning:string}>={
 ev_mean:{title:'المتوسط Mean',action:'النتيجة الإجمالية',meaning:'يجمع النتائج في متوسط واحد؛ لا يصف توزيع الأفراد وحده'},
 ev_median:{title:'الوسيط Median',action:'منتصف النتائج',meaning:'يوضح منتصف النتائج بعد ترتيبها'},
 ev_range:{title:'المدى Range',action:'حدود النتائج',meaning:'يقارن المسافة بين أقل وأعلى نتيجة'},
 ev_sd:{title:'الانحراف المعياري SD',action:'فحص التشتت',meaning:'يوضح مقدار ابتعاد النتائج عن المتوسط'},
 ev_iqr:{title:'المدى الربيعي IQR',action:'النصف الأوسط',meaning:'يقارن نطاق النصف الأوسط من النتائج'},
 ev_threshold:{title:'معيار 85%',action:'تطبيق المعيار',meaning:'يوضح انتشار تحقيق المعيار بين الأفراد'},
};
export const EVIDENCE_ORDER=Object.keys(EVIDENCE) as EvidenceId[];
