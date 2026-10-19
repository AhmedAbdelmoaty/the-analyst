import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SCENES, type SceneKey } from '../data/assets';

/** Stable image plate: typewriter updates never change its key or restart the scene. */
export function ScenePlayer({ sceneKey, children }: { sceneKey: SceneKey; children?: React.ReactNode }) {
  const asset = SCENES[sceneKey];
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLDivElement>(null);
  return <div className="rd-scene" data-scene={sceneKey} onPointerMove={event => {
    if (reduced || event.pointerType !== 'mouse' || window.innerWidth < 900 || event.currentTarget.closest('.rd-paused')) return;
    image.current?.style.setProperty('--rd-parallax-x', `${(event.clientX / window.innerWidth - .5) * 3}px`);
    image.current?.style.setProperty('--rd-parallax-y', `${(event.clientY / window.innerHeight - .5) * 2}px`);
  }} onPointerLeave={() => {
    image.current?.style.setProperty('--rd-parallax-x', '0px');
    image.current?.style.setProperty('--rd-parallax-y', '0px');
  }}>
    <div className="rd-scene-plates" ref={image}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.picture key={sceneKey} className="rd-scene-picture" initial={{ opacity: 0 }} animate={{ opacity: failed ? 0 : 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .1 : .35 }}>
          <source media="(max-width: 640px)" srcSet={asset.portrait}/>
          <img src={asset.landscape} alt="" onLoad={() => setFailed(false)} onError={() => setFailed(true)}/>
        </motion.picture>
      </AnimatePresence>
      {failed && <div className="rd-scene-asset-error" role="img" aria-label="تعذر تحميل مشهد اللعبة">تعذر تحميل مشهد اللعبة</div>}
    </div>
    <div className="rd-scene-wash"/>{children}
  </div>;
}
