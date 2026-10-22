import { useAuth } from '@/contexts/AuthContext';

export default function CrackTheCodeRoute() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#fff6e7]">
      <iframe
        key={user.id}
        name={user.id}
        title="Crack the Code — الشفرة الأخيرة"
        src="/crack-the-code/index.html"
        allow="autoplay"
        className="block h-full w-full border-0"
      />
    </main>
  );
}
