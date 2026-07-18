// Generates the OG share image, embedding the real Netravax logo (copied directly
// from the Netravax platform's own favicon assets — see public/android-chrome-*.png,
// public/favicon*.png/ico and public/apple-touch-icon.png, which are literal copies,
// not generated). Rendered with the Playwright chromium that already ships as a
// devDependency, so there is no extra runtime dependency. Re-run with:
// npm run generate:icons
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "..", "public");

const logoBase64 = readFileSync(resolve(publicDir, "android-chrome-512x512.png")).toString("base64");
const logoDataUri = `data:image/png;base64,${logoBase64}`;

const fontStack = 'Inter, ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
const displayFontStack = `"Space Grotesk", ${fontStack}`;
const spaceGroteskBase64 = readFileSync(resolve(publicDir, "fonts", "space-grotesk-700.woff2")).toString("base64");
const displayFontFace = `
  @font-face {
    font-family: "Space Grotesk";
    font-weight: 700;
    font-style: normal;
    src: url(data:font/woff2;base64,${spaceGroteskBase64}) format("woff2");
  }
`;

const ogHtml = `<!doctype html><html><head><meta charset="utf-8" /><style>
  ${displayFontFace}
  html, body { margin: 0; padding: 0; }
  .og {
    position: relative; width: 1200px; height: 630px; overflow: hidden;
    box-sizing: border-box; padding: 68px 80px;
    color: #effaf5; font-family: ${fontStack};
    background:
      radial-gradient(circle at 12% 18%, rgba(116, 238, 185, 0.16), transparent 42%),
      radial-gradient(circle at 88% 6%, rgba(139, 188, 255, 0.12), transparent 40%),
      linear-gradient(180deg, #06100e 0%, #07110f 42%, #081310 100%);
  }
  .grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 78%);
  }
  .net { position: absolute; right: 40px; top: 70px; width: 560px; height: 560px; opacity: 0.9; }
  .net .nodes { filter: drop-shadow(0 0 7px rgba(219, 255, 142, 0.8)); }
  .content { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand .mark {
    width: 56px; height: 56px; border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(116, 238, 185, 0.42);
  }
  .brand .mark img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .brand strong { font-family: ${displayFontStack}; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .eyebrow {
    margin-top: 70px; color: #74eeb9; font-family: ${displayFontStack}; font-size: 21px; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
  }
  h1 {
    margin: 20px 0 0; max-width: 720px; font-family: ${displayFontStack}; font-size: 60px; line-height: 1.04;
    font-weight: 700; letter-spacing: -0.02em;
  }
  .sub { margin-top: 24px; max-width: 640px; color: #a9c6bd; font-size: 24px; line-height: 1.4; }
  .foot { position: absolute; left: 80px; bottom: 60px; display: flex; align-items: center; gap: 14px; }
  .foot .dot { width: 10px; height: 10px; border-radius: 50%; background: #dbff8e; }
  .foot span { color: #74eeb9; font-family: ${displayFontStack}; font-size: 24px; font-weight: 700; letter-spacing: 0.01em; }
</style></head><body>
  <div class="og">
    <div class="grid"></div>
    <svg class="net" viewBox="0 0 560 560" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#74eeb9" stroke-width="1.6" opacity="0.5" fill="none">
        <path d="M60 300 L170 180 L300 240 L420 120 L520 210" />
        <path d="M170 180 L200 60 L420 120" />
        <path d="M60 300 L300 240 L360 420 L520 210" />
        <path d="M300 240 L360 420 L200 480" />
      </g>
      <g class="nodes" fill="#dbff8e">
        <circle cx="60" cy="300" r="6.5" /><circle cx="170" cy="180" r="6.5" />
        <circle cx="200" cy="60" r="6.5" /><circle cx="300" cy="240" r="8" />
        <circle cx="420" cy="120" r="6.5" /><circle cx="520" cy="210" r="6.5" />
        <circle cx="360" cy="420" r="6.5" /><circle cx="200" cy="480" r="6.5" />
      </g>
    </svg>
    <div class="content">
      <div class="brand">
        <span class="mark"><img src="${logoDataUri}" alt="" /></span>
        <strong>Netravax Technologies</strong>
      </div>
      <p class="eyebrow">Networking · Infrastructure · Cybersecurity</p>
      <h1>Secure, reliable and intelligent digital infrastructure.</h1>
      <div class="foot"><span class="dot"></span><span>netravax.shubodaya.dev</span></div>
    </div>
  </div>
</body></html>`;

async function shoot(page, html, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: resolve(publicDir, out) });
  console.log("wrote public/" + out);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await shoot(page, ogHtml, 1200, 630, "og-image.png");
await browser.close();
