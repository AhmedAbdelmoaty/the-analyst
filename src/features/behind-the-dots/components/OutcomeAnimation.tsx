/** A short, playful scene that replays whenever an outcome screen mounts. */
export function OutcomeAnimation({ kind }: { kind: "win" | "lose" }) {
  return (
    <div className={`outcome-stage outcome-stage-${kind}`} aria-hidden="true" dir="ltr">
      <div className="outcome-ground" />
      <img className="outcome-leila" src="/assets/behind-dots/guide.png" alt="" />
      <img className="outcome-dotty" src="/assets/behind-dots/dotty.png" alt="" />
      {kind === "lose" && <img className="outcome-glitch" src="/assets/behind-dots/glitch.png" alt="" />}
      {kind === "win" && <div className="outcome-fireworks"><span /><span /><span /></div>}
      {kind === "lose" && <span className="outcome-burp">هَمّ! 😋</span>}
    </div>
  );
}
