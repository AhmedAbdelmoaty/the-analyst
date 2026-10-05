import { SoundProvider } from '@/hooks/useSoundEffects';
import { BootLoader } from '@/components/game/BootLoader';
import Index from './Index';
export default function GameRoute() { return <SoundProvider><BootLoader><Index /></BootLoader></SoundProvider>; }
