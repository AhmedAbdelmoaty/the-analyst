import { useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SHOT_ASSETS } from '../data/assets';
import fallbackScene from '@/assets/scenes/mansour-office-seated-male.webp';

// Perception Lab screen-switch: overlap the image plates rather than exposing a blank stage.
export function ScenePlayer({shotId,children}:{shotId:string;children?:React.ReactNode}) {
  const asset=SHOT_ASSETS[shotId]??SHOT_ASSETS.A00;
  const reduced=useReducedMotion();
  const image=useRef<HTMLDivElement>(null);
  return <div className="rd-scene" onPointerMove={event=>{
    if(reduced||event.pointerType!=='mouse'||window.innerWidth<900||event.currentTarget.closest('.rd-paused'))return;
    image.current?.style.setProperty('--rd-parallax-x',`${(event.clientX/window.innerWidth-.5)*6}px`);
    image.current?.style.setProperty('--rd-parallax-y',`${(event.clientY/window.innerHeight-.5)*4}px`);
  }} onPointerLeave={()=>{image.current?.style.setProperty('--rd-parallax-x','0px');image.current?.style.setProperty('--rd-parallax-y','0px');}}>
    <div className="rd-scene-plates" ref={image}><AnimatePresence mode="sync" initial={false}><motion.picture key={shotId} initial={{opacity:0,scale:reduced?1:1.025}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:reduced?.1:.35}}><source media="(max-width:640px)" srcSet={asset.portrait}/><img src={asset.landscape} alt="" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src=fallbackScene;}}/></motion.picture></AnimatePresence></div>
    <div className="rd-scene-wash"/>{children}
  </div>;
}
