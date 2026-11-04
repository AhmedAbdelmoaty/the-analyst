import { Link } from 'react-router-dom';
import TeamPerformanceGame from '@/features/team-performance/TeamPerformanceGame';

export default function TeamPerformanceRoute() {
  return (
    <main className="grid h-[100dvh] w-full grid-rows-[3rem_minmax(0,1fr)] overflow-hidden">
      <header dir="rtl" className="flex items-center border-b bg-background px-3">
        <Link to="/app" className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-bold text-foreground hover:bg-muted">رجوع لاختيار الألعاب</Link>
      </header>
      <TeamPerformanceGame />
    </main>
  );
}
