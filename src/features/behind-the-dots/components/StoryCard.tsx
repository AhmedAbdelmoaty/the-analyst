import type { ReactNode } from "react";

export function GuideAvatar({ size = 68 }: { size?: number }) {
  return <img src="/assets/behind-dots/guide.png" alt="" width={size} height={size} className="guide-avatar shrink-0 rounded-full border bg-[#fff7ec] object-cover" />;
}

export function StoryCard({ who = "hala", children, delay = 0 }: { who?: "hala" | "player"; children: ReactNode; delay?: number }) {
  if (who === "player") {
    return (
      <div className="flex animate-rise justify-end" style={{ animationDelay: `${delay}ms` }}>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-foreground px-4 py-3 text-lg leading-relaxed text-background">
          <div className="mb-0.5 text-sm opacity-70">أنت · صاحب القرار</div>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex animate-rise items-start gap-3" style={{ animationDelay: `${delay}ms` }}>
      <GuideAvatar />
      <div className="max-w-[calc(100%-6rem)] rounded-2xl rounded-tr-sm border bg-card px-4 py-3 text-lg leading-relaxed shadow-card">
        <div className="mb-0.5 text-sm font-semibold text-primary">ليلى · صاحبة عربية الآيس كريم</div>
        {children}
      </div>
    </div>
  );
}
