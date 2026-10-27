import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function DecisionMatrixRoute() {
  const { user } = useAuth();
  const showResult = new URLSearchParams(useLocation().search).get('showResult') === '1';
  if (!user) return null;

  return (
    <main className="grid h-[100dvh] w-full grid-rows-[3rem_minmax(0,1fr)] overflow-hidden bg-[#fbf7ee]">
      <header className="flex items-center border-b border-[#ded3be] px-3 sm:px-5">
        <Link
          to="/app"
          className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-bold text-[#631221] outline-offset-2 hover:bg-[#f5eedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#851b2e]"
        >
          رجوع لاختيار الألعاب
        </Link>
      </header>
      <iframe
        key={user.id}
        name={user.id}
        title="مصفوفة القرار — أول يوم في الشركة"
        src={`/decision-matrix/index.html${showResult ? '?showResult=1' : ''}`}
        allow="autoplay"
        className="block h-full min-h-0 w-full border-0"
      />
    </main>
  );
}
