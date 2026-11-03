import { Music2, Volume2, VolumeX } from 'lucide-react';
import { usePlatformAudio } from './PlatformAudio';
import { platformAudio } from './mixer';

export function SoundToggle() {
  const state = usePlatformAudio();
  const active = state.enabled && state.unlocked;
  return <button type="button" data-platform-sound-toggle className="platform-icon" aria-label={active ? 'كتم الصوت' : 'تشغيل الصوت'} aria-pressed={active} title={state.playing ? 'الموسيقى شغالة' : active ? 'الصوت مفعّل' : 'فعّل صوت التجربة'} onClick={() => {
    platformAudio.update({ enabled: !active }); if (!active) platformAudio.unlock();
  }}>{active ? <Volume2 /> : <VolumeX />}</button>;
}
export default function AudioControls() {
  const state = usePlatformAudio();
  return <div className="audio-controls">
    <div className="flex items-center justify-between gap-3"><p className="platform-muted" role="status">{state.unavailable ? 'الصوت مش متاح حاليًا؛ جرّب تشغيله تاني.' : state.playing ? 'الموسيقى شغالة' : state.enabled && state.unlocked ? 'الصوت مفعّل' : 'اضغط لتشغيل صوت التجربة'}</p><SoundToggle /></div>
    <div className="audio-row"><button type="button" className="platform-icon" aria-label={state.musicMuted ? 'تشغيل الموسيقى' : 'كتم الموسيقى'} aria-pressed={!state.musicMuted} onClick={() => { platformAudio.update({ musicMuted: !state.musicMuted }); platformAudio.unlock(); }}><Music2 /></button><label>مستوى الموسيقى <span>{Math.round(state.musicVolume * 100)}٪</span><input aria-label="مستوى الموسيقى" type="range" min="0" max="100" value={Math.round(state.musicVolume * 100)} onChange={event => platformAudio.update({ musicVolume: Number(event.target.value) / 100 })} /></label></div>
    <div className="audio-row"><button type="button" className="platform-icon" aria-label={state.sfxMuted ? 'تشغيل المؤثرات' : 'كتم المؤثرات'} aria-pressed={!state.sfxMuted} onClick={() => { platformAudio.update({ sfxMuted: !state.sfxMuted }); platformAudio.unlock(); platformAudio.play('choice'); }}>{state.sfxMuted ? <VolumeX /> : <Volume2 />}</button><label>مستوى المؤثرات <span>{Math.round(state.sfxVolume * 100)}٪</span><input aria-label="مستوى المؤثرات" type="range" min="0" max="100" value={Math.round(state.sfxVolume * 100)} onChange={event => platformAudio.update({ sfxVolume: Number(event.target.value) / 100 })} /></label></div>
    <label className="motion-choice"><input type="checkbox" checked={state.reducedMotion} onChange={event => platformAudio.update({ reducedMotion: event.target.checked })} />تقليل الحركة والمؤثرات البصرية</label>
  </div>;
}
