import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export default function CrackTheCodeRoute() {
  const { user } = useAuth();
  const showResult = new URLSearchParams(useLocation().search).get('showResult') === '1';
  if (!user) return null;

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#fff6e7]">
      <iframe
        key={user.id}
        name={user.id}
        title="Crack the Code — الشفرة الأخيرة"
        src={`/crack-the-code/index.html${showResult ? '?showResult=1' : ''}`}
        allow="autoplay"
        className="block h-full w-full border-0"
      />
    </main>
  );
}
