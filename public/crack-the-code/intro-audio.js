/* Automatic opening narration, with no audio controls. */
globalThis.IntroVoice = (() => {
  let audio, image, active=false, ready=false, pending=false, waiting=false, revision=0;
  function removeGestures(){document.removeEventListener('pointerdown',retry);document.removeEventListener('keydown',retry)}
  function retry(event){
    if(!active||!waiting||event.target?.closest?.('#opening-start, #opening-learn'))return;
    play();
  }
  async function play(){
    if(!active||!ready||pending||!audio||document.hidden)return;
    const current=revision;pending=true;
    try{
      await audio.play();
      if(!active||current!==revision||document.hidden){audio.pause();return}
      waiting=false;removeGestures();
    }catch(error){
      if(active&&current===revision&&error?.name==='NotAllowedError'){
        waiting=true;document.addEventListener('pointerdown',retry);document.addEventListener('keydown',retry);
      }
    }finally{pending=false}
  }
  function imageLoaded(){ready=true;play()}
  function show(){
    image=document.querySelector('.opening-image');
    if(!image||typeof Audio!=='function')return;
    if(!audio){
      audio=new Audio('assets/manager-intro.wav');audio.preload='auto';audio.loop=false;
      audio.addEventListener('ended',()=>{waiting=false;removeGestures()});
      audio.addEventListener('error',()=>{waiting=false;removeGestures()});
      document.addEventListener('visibilitychange',()=>{
        if(!active)return;
        if(document.hidden)audio.pause();else if(!audio.ended)play();
      });
    }
    active=true;ready=false;waiting=false;revision++;removeGestures();audio.currentTime=0;
    if(image.complete){if(image.naturalWidth)imageLoaded()}
    else image.addEventListener('load',imageLoaded,{once:true});
  }
  function hide(){
    active=false;waiting=false;revision++;removeGestures();
    image?.removeEventListener('load',imageLoaded);
    if(audio){audio.pause();audio.currentTime=0}
  }
  return {show,hide};
})();
