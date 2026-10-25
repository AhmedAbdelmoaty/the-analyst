/* Egyptian Arabic voice lines. Generated MP3 files ship with the game. */
(function(root){
const rounds=[
 [
  {who:'omar',text:'أنا كنت مستني غير كده. خيبت أملي فيك. ارجع للأرقام، وورّينا التحليل الصح.',file:'omar-1.mp3'},
  {who:'karim',text:'هو ده بقى الأناليست اللي جاي يحل مشاكلنا؟ طب نجرب بالأرقام المرة دي.',file:'karim-1.mp3'},
  {who:'mariam',text:'خلاص يا جماعة. خد نفسك، وراجع الأدلة تاني. المرة الجاية تبقى أحسن.',file:'mariam-1.mp3'}
 ],
 [
  {who:'omar',text:'إحنا محتاجين قرار مبني على دليل، مش على إحساس. لسه مستني منك أحسن من كده.',file:'omar-2.mp3'},
  {who:'sara',text:'حلو الحماس. ناقصه شوية تحليل بس. إحنا خلصنا القهوة ولسه مستنيين القرار.',file:'sara-2.mp3'},
  {who:'karim',text:'أجيب قهوة تانية، ولا المرة الجاية هتظبط؟',file:'karim-2.mp3'}
 ],
 [
  {who:'omar',text:'الاجتماع لسه ما اقتنعش. ارجع للأرقام، وخليك أدق المرة دي.',file:'omar-3.mp3'},
  {who:'karim',text:'بصراحة، الاجتماع ده بقى فيه تشويق أكتر من الشغل.',file:'karim-3.mp3'},
  {who:'mariam',text:'سيبك من التعليقات. راجع الأدلة واحدة واحدة، وجرب تاني.',file:'mariam-3.mp3'}
 ]
];
const voices={
 omar:{voice:'ar-EG-ShakirNeural',rate:'-8%',pitch:'-12Hz'},
 karim:{voice:'ar-EG-ShakirNeural',rate:'+6%',pitch:'+14Hz'},
 sara:{voice:'ar-EG-SalmaNeural',rate:'+3%',pitch:'+7Hz'},
 mariam:{voice:'ar-EG-SalmaNeural',rate:'-5%',pitch:'-6Hz'}
};
root.DM_REACTIONS={rounds,voices};
if(typeof module!=='undefined')module.exports=root.DM_REACTIONS;
})(typeof window!=='undefined'?window:globalThis);
