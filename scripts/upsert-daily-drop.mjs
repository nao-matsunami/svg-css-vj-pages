import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());

const titles = ["Vector Signal Rings", "Glyph Orbit Score", "Dash Phase Gate", "Logo Pulse Mesh", "Linear Bloom Mark"];
const copyLines = [
  "SVGとCSS animationで構成する、軽量なベクターVJループ。",
  "ロゴモーションやWebサンプルに展開しやすい、線と図形の抽象ループ。",
  "DOM上の図形を日付シードで配置する、コード共有向きのVJ素材。",
];
const whyLines = [
  "SVG/CSSはベクター図形をDOMとして扱えるため、軽量なサンプル公開とコード共有に向く。今日は線形パターンと軌道グリフのフレームを優先した。",
  "CanvasやThree.jsと違い、SVG/CSSは図形そのものを編集・再利用しやすい。ロゴモーションやUI的なVJ素材へ展開する前提で作る。",
  "販売用の高品質映像は後でMac mini側で生成し、GitHub Pagesでは軽量なベクターサンプルとして見せる運用にする。",
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
const existing = data.drops.find((drop) => drop.date === targetDate);
if (existing) {
  console.log(`Daily drop already exists: ${targetDate} / ${existing.title}`);
  process.exit(0);
}

const seed = hash(targetDate);
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
const drop = {
  date: targetDate,
  title: titles[seed % titles.length],
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.7, 0.95), ...hsv(hueB, 0.68, 0.86)],
  copy: copyLines[seed % copyLines.length],
  why: whyLines[seed % whyLines.length],
};

data.drops.unshift(drop);
data.drops.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dropsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added daily drop: ${targetDate} / ${drop.title}`);

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hash(value) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return Math.abs(out);
}

function fract(value) {
  return value - Math.floor(value);
}

function hsv(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
  return table[i % 6].map((n) => Number(n.toFixed(3)));
}
