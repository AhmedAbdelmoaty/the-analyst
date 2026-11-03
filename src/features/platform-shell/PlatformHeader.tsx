import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import analystLockup from '@/assets/brand/the-analyst-lockup.png';
import './platform.css';
import './arcade.css';
import { SoundToggle } from '@/features/platform-audio/AudioControls';

export default function PlatformHeader({ children, home = '/app' }: { children?: ReactNode; home?: string }) {
  return <header className="platform-header">
    <Link to={home} className="platform-brand" aria-label="The Analyst"><img src={analystLockup} alt="The Analyst" /><span>مساحة للعب والتفكير</span></Link>
    <nav aria-label="قائمة اللاعب"><SoundToggle />{children}</nav>
  </header>;
}
