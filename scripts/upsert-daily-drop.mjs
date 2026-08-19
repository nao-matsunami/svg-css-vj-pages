import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());

const engines = [
  {
    slug: "vector-orbits",
    titles: ["Vector Signal Rings", "Glyph Orbit Score", "Dash Phase Gate", "Logo Pulse Mesh", "Linear Bloom Mark"],
    copy: "SVGとCSS animationで構成する、軽量なベクターVJループ。",
    why: "既存系列として、リング、スポーク、軌道グリフを増やす。DOM上の図形を編集しやすい形で残す。",
  },
  {
    slug: "type-poster",
    titles: ["SVG Type Poster", "Kinetic Word Stack", "Vector Caption Wall", "Monospace Motion Plate"],
    copy: "SVGテキストとラインを使う、ポスター/タイポグラフィ系VJループ。",
    why: "図形抽象とは別に、文字や見出しを動かす文脈を作る。イベント名やブランドモーションに展開しやすい。",
  },
  {
    slug: "mask-symbols",
    titles: ["SVG Mask Symbol Field", "Diamond Matte Orbit", "Cutout Signal Plate", "Vector Alpha Symbol"],
    copy: "記号形状とマスク化しやすい輪郭を主役にしたSVGループ。",
    why: "黒抜きやアルファ素材にしやすい形状をSVG側にも持たせる。販売用素材として再利用しやすい。",
  },
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
const existing = data.drops.find((drop) => drop.date === targetDate);
if (existing) {
  console.log(`Daily drop already exists: ${targetDate} / ${existing.title}`);
  process.exit(0);
}

const seed = hash(targetDate);
const engine = engines[seed % engines.length];
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
const drop = {
  date: targetDate,
  title: engine.titles[seed % engine.titles.length],
  engine: engine.slug,
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.7, 0.95), ...hsv(hueB, 0.68, 0.86)],
  copy: engine.copy,
  why: engine.why,
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
