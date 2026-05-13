import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const root = process.cwd();
const outDir = path.join(root, "output", "promo");
const gameUrl = "https://problem-framing.lovable.app";

const asset = (...parts) =>
  path.join(root, ...parts).replaceAll("\\", "/");

const assets = {
  logo: asset("src", "assets", "brand", "imp-logo.webp"),
  framingDesk: asset("src", "assets", "scenes", "framing-board-desk.webp"),
  reportHand: asset("src", "assets", "scenes", "hisham-handing-report-male.webp"),
  velaroStore: asset("src", "assets", "scenes", "velaro-interior-wide.webp"),
};

const variants = [
  {
    id: "data-analysis-cinematic-branded",
    title: "Data Analysis",
    kicker: "Interactive Learning Case",
    subtitle: "اسأل السؤال الصح قبل ما تحلل الرقم",
    note: "Problem Framing • VELARO Case",
    cta: "امسح وجرب القضية",
    background: assets.framingDesk,
    className: "cinematic branded",
    showLogo: true,
  },
  {
    id: "data-analysis-qr-first",
    title: "Data Analysis",
    kicker: "Play the case now",
    subtitle: "اختبر تفكيرك كمحلل بيانات",
    note: "5 قرارات صغيرة تكشف المشكلة الحقيقية",
    cta: "Scan to Play",
    background: assets.reportHand,
    className: "qrFirst branded",
    showLogo: true,
  },
  {
    id: "data-analysis-cinematic-no-logo",
    title: "Data Analysis",
    kicker: "Problem Framing Game",
    subtitle: "المشكلة مش دايمًا في الرقم",
    note: "اسأل. افهم. حلل. قرر.",
    cta: "امسح وجرب القضية",
    background: assets.framingDesk,
    className: "cinematic noLogo",
    showLogo: false,
  },
];

const css = `
@font-face {
  font-family: "PromoUI";
  src: local("Segoe UI"), local("Arial");
}

* { box-sizing: border-box; }
body {
  margin: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  font-family: "PromoUI", "Tahoma", "Arial", sans-serif;
  background: #111;
}

.slide {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  color: white;
  isolation: isolate;
}

.bg {
  position: absolute;
  inset: 0;
  background-image: var(--bg);
  background-size: cover;
  background-position: center;
  transform: scale(1.035);
  filter: saturate(1.08) contrast(1.05);
  z-index: -4;
}

.slide::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 76% 34%, rgba(255, 191, 88, .22), transparent 34%),
    linear-gradient(90deg, rgba(8, 13, 19, .96) 0%, rgba(12, 17, 23, .82) 38%, rgba(14, 16, 20, .42) 70%, rgba(10, 10, 10, .64) 100%);
  z-index: -3;
}

.slide::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(90deg, black 0%, black 46%, transparent 82%);
  z-index: -2;
}

.content {
  position: absolute;
  inset: 0;
  padding: 86px 100px 82px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  gap: 76px;
  align-items: center;
}

.brand {
  position: absolute;
  top: 56px;
  left: 76px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .24);
}

.brand img {
  width: 230px;
  height: auto;
  display: block;
}

.brand span {
  color: #7b1118;
  font-weight: 800;
  font-size: 24px;
  letter-spacing: .01em;
}

.copy {
  padding-top: 50px;
  max-width: 960px;
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #ffd9a4;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.kicker::before {
  content: "";
  width: 58px;
  height: 5px;
  border-radius: 999px;
  background: #b51d2a;
  box-shadow: 0 0 34px rgba(181, 29, 42, .7);
}

h1 {
  margin: 34px 0 0;
  font-size: 136px;
  line-height: .93;
  font-weight: 950;
  letter-spacing: -0.035em;
  text-shadow: 0 22px 60px rgba(0, 0, 0, .48);
}

.subtitle {
  margin-top: 36px;
  direction: rtl;
  text-align: right;
  width: fit-content;
  max-width: 820px;
  padding: 18px 26px 22px;
  border-right: 8px solid #b51d2a;
  border-radius: 0 20px 20px 0;
  background: rgba(255, 255, 255, .10);
  backdrop-filter: blur(8px);
  font-size: 48px;
  line-height: 1.32;
  font-weight: 900;
  color: #fff8ea;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
}

.note {
  margin-top: 30px;
  color: rgba(255,255,255,.82);
  font-size: 31px;
  font-weight: 700;
}

.note.ar {
  direction: rtl;
  text-align: right;
  width: fit-content;
}

.qrCard {
  justify-self: end;
  width: 504px;
  border-radius: 34px;
  padding: 26px;
  background: rgba(255, 255, 255, .96);
  color: #15181f;
  box-shadow: 0 30px 90px rgba(0, 0, 0, .38);
  border: 1px solid rgba(255, 255, 255, .65);
}

.qrCard .label {
  direction: rtl;
  text-align: center;
  font-size: 34px;
  font-weight: 950;
  color: #b51d2a;
  margin: 0 0 18px;
}

.qrFrame {
  width: 430px;
  height: 430px;
  margin: 0 auto;
  padding: 18px;
  border-radius: 24px;
  background: white;
  border: 2px solid rgba(18, 24, 31, .10);
}

.qrFrame img {
  width: 100%;
  height: 100%;
  display: block;
}

.url {
  margin-top: 18px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  color: #2a2d33;
  letter-spacing: -.01em;
}

.qrFirst::before {
  background:
    radial-gradient(circle at 68% 46%, rgba(255, 222, 166, .2), transparent 34%),
    linear-gradient(90deg, rgba(8, 13, 19, .96) 0%, rgba(12, 17, 23, .76) 46%, rgba(12, 13, 16, .72) 100%);
}

.qrFirst .content {
  grid-template-columns: minmax(0, 1fr) 650px;
}

.qrFirst .qrCard {
  width: 630px;
  padding: 34px;
}

.qrFirst .qrFrame {
  width: 548px;
  height: 548px;
}

.qrFirst h1 {
  font-size: 122px;
}

.qrFirst .subtitle {
  font-size: 44px;
}

.noLogo .copy {
  padding-top: 0;
}

.noLogo .content {
  padding-top: 72px;
}

.cornerMark {
  position: absolute;
  right: 84px;
  bottom: 58px;
  color: rgba(255, 255, 255, .52);
  font-size: 23px;
  font-weight: 800;
  letter-spacing: .06em;
}
`;

const html = (variant, qrFile) => `<!doctype html>
<html lang="ar" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1920,height=1080" />
  <title>${variant.id}</title>
  <style>${css}</style>
</head>
<body>
  <main class="slide ${variant.className}" style="--bg: url('file:///${variant.background}')">
    <div class="bg"></div>
    ${variant.showLogo ? `<div class="brand"><img src="file:///${assets.logo}" alt="IMP" /><span>Powered by IMP</span></div>` : ""}
    <section class="content">
      <div class="copy">
        <div class="kicker">${variant.kicker}</div>
        <h1>${variant.title}</h1>
        <div class="subtitle">${variant.subtitle}</div>
        <div class="note ${/[\u0600-\u06FF]/.test(variant.note) ? "ar" : ""}">${variant.note}</div>
      </div>
      <aside class="qrCard">
        <p class="label">${variant.cta}</p>
        <div class="qrFrame"><img src="file:///${qrFile}" alt="QR code" /></div>
        <div class="url">problem-framing.lovable.app</div>
      </aside>
    </section>
    <div class="cornerMark">CASE OF DATA</div>
  </main>
</body>
</html>`;

await fs.mkdir(outDir, { recursive: true });

const qrFile = path.join(outDir, "problem-framing-qr.png").replaceAll("\\", "/");
await QRCode.toFile(qrFile, gameUrl, {
  errorCorrectionLevel: "H",
  margin: 4,
  scale: 12,
  color: {
    dark: "#101418",
    light: "#ffffff",
  },
});

for (const variant of variants) {
  const file = path.join(outDir, `${variant.id}.html`);
  await fs.writeFile(file, html(variant, qrFile), "utf8");
  console.log(file);
}

console.log(qrFile);
