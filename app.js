const svg = document.querySelector("#vj-svg");
const exportCanvas = document.querySelector("#export-canvas");
const exportContext = exportCanvas.getContext("2d", { alpha: false });
const ringLayer = document.querySelector("#ring-layer");
const spokeLayer = document.querySelector("#spoke-layer");
const glyphLayer = document.querySelector("#glyph-layer");
const initialIso = new URLSearchParams(window.location.search).get("date") || localIsoDate(new Date());

let sources = [];
let drops = [];
let purchaseConfig = {
  enabled: false,
  label: "Full Pack",
  url: "",
  note: "映像データの購入先は準備中です。",
};
let activePiece;
let animationId = 0;
let startTime = performance.now();
let pausedAt = 0;
let isPaused = false;
let calmMotion = false;
let videoRecorder = null;
let recordingStartedAt = 0;
let recordingProgressId = 0;
let alphaFrameId = 0;

initialize();

async function initialize() {
  await loadData();
  activePiece = pickPiece(initialIso);
  buildSvg(activePiece);
  renderContent();
  requestAnimationFrame(draw);
}

async function loadData() {
  try {
    const [dropsResponse, purchaseResponse] = await Promise.all([
      fetch("./data/drops.json", { cache: "no-store" }),
      fetch("./data/purchase.json", { cache: "no-store" }),
    ]);
    if (dropsResponse.ok) {
      const data = await dropsResponse.json();
      if (Array.isArray(data.sources)) sources = data.sources;
      if (Array.isArray(data.drops)) drops = data.drops.sort((a, b) => b.date.localeCompare(a.date));
    }
    if (purchaseResponse.ok) purchaseConfig = { ...purchaseConfig, ...(await purchaseResponse.json()) };
  } catch {
    drops = [];
  }
}

function buildSvg(piece) {
  ringLayer.innerHTML = "";
  spokeLayer.innerHTML = "";
  glyphLayer.innerHTML = "";
  const paletteA = cssRgb(piece.palette.slice(0, 3));
  const paletteB = cssRgb(piece.palette.slice(3, 6));
  const seed = hash(`${piece.date}:${piece.title}`);
  const variant = pieceVariant(piece);
  const engine = pieceEngine(piece);
  svg.dataset.variant = String(variant);
  svg.dataset.engine = engine;

  if (engine === "type-poster") {
    buildTypePoster(piece, paletteA, paletteB, seed);
    return;
  }

  if (engine === "mask-symbols") {
    buildMaskSymbols(piece, paletteA, paletteB, seed);
    return;
  }

  const ringCount = variant === 2 ? 5 : 10;
  for (let i = 0; i < ringCount; i += 1) {
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.classList.add("vj-ring");
    ring.dataset.index = String(i);
    ring.setAttribute("r", String(variant === 1 ? 44 + i * 54 : 70 + i * 42));
    ring.setAttribute("stroke", i % 2 === 0 ? paletteA : paletteB);
    ring.setAttribute("stroke-width", String(variant === 2 ? 8 + (i % 3) : 3 + (i % 4)));
    ring.setAttribute("stroke-opacity", String(0.18 + (10 - i) * 0.035));
    ring.setAttribute("stroke-dasharray", variant === 0 ? `${18 + i * 3} ${22 + i * 4}` : `${6 + i * 2} ${34 + i * 5}`);
    ringLayer.append(ring);
  }

  const spokeCount = variant === 3 ? 18 : 48;
  for (let i = 0; i < spokeCount; i += 1) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("vj-spoke");
    line.dataset.index = String(i);
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", String(variant === 3 ? 520 : 130 + ((i * 19 + seed) % 260)));
    line.setAttribute("y2", "0");
    line.setAttribute("stroke", i % 2 === 0 ? paletteA : paletteB);
    line.setAttribute("stroke-width", String(1 + (i % 3)));
    line.setAttribute("stroke-opacity", "0.22");
    spokeLayer.append(line);
  }

  for (let i = 0; i < 12; i += 1) {
    const glyph = document.createElementNS("http://www.w3.org/2000/svg", variant === 1 ? "path" : variant === 2 ? "circle" : "rect");
    glyph.classList.add("vj-glyph");
    glyph.dataset.index = String(i);
    if (variant === 1) {
      glyph.setAttribute("d", "M-32 0 C-12 -38 18 -38 32 0 C12 38 -18 38 -32 0Z");
    } else if (variant === 2) {
      glyph.setAttribute("r", String(16 + (i % 4) * 6));
    } else {
      glyph.setAttribute("x", "-26");
      glyph.setAttribute("y", "-26");
      glyph.setAttribute("width", "52");
      glyph.setAttribute("height", "52");
      glyph.setAttribute("rx", variant === 3 ? "0" : "4");
    }
    glyph.setAttribute("stroke", i % 2 === 0 ? paletteA : paletteB);
    glyph.setAttribute("fill", "none");
    glyph.setAttribute("stroke-width", variant === 2 ? "5" : "3");
    glyph.setAttribute("stroke-opacity", "0.42");
    glyphLayer.append(glyph);
  }
}

function buildTypePoster(piece, paletteA, paletteB, seed) {
  const words = piece.title.toUpperCase().split(/\s+/).slice(0, 3);
  for (let i = 0; i < 10; i += 1) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.classList.add("vj-glyph");
    text.dataset.index = String(i);
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, monospace");
    text.setAttribute("font-size", String(38 + (i % 3) * 14));
    text.setAttribute("fill", i % 2 ? paletteA : paletteB);
    text.setAttribute("fill-opacity", "0.34");
    text.textContent = words[i % words.length] || "VJ";
    glyphLayer.append(text);
  }
  for (let i = 0; i < 32; i += 1) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("vj-spoke");
    line.dataset.index = String(i);
    line.setAttribute("x1", "-460");
    line.setAttribute("y1", String(-260 + i * 18));
    line.setAttribute("x2", String(120 + ((i * 17 + seed) % 420)));
    line.setAttribute("y2", String(-260 + i * 18));
    line.setAttribute("stroke", i % 2 ? paletteA : paletteB);
    line.setAttribute("stroke-opacity", "0.24");
    line.setAttribute("stroke-width", String(2 + (i % 4)));
    spokeLayer.append(line);
  }
}

function buildMaskSymbols(piece, paletteA, paletteB, seed) {
  for (let i = 0; i < 18; i += 1) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("vj-glyph");
    path.dataset.index = String(i);
    path.setAttribute("d", "M0 -42 L36 0 L0 42 L-36 0Z");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", i % 2 ? paletteA : paletteB);
    path.setAttribute("stroke-width", String(2 + (i % 5)));
    path.setAttribute("stroke-opacity", "0.38");
    glyphLayer.append(path);
  }
  for (let i = 0; i < 8; i += 1) {
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.classList.add("vj-ring");
    ring.dataset.index = String(i);
    ring.setAttribute("r", String(80 + i * 48 + (seed % 17)));
    ring.setAttribute("stroke", i % 2 ? paletteA : paletteB);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke-width", "5");
    ring.setAttribute("stroke-opacity", "0.28");
    ringLayer.append(ring);
  }
}

function draw(now) {
  const elapsed = isPaused ? pausedAt : (now - startTime) / 1000;
  const speed = calmMotion ? 0.38 : 1;
  const cycle = ((elapsed * speed) % activePiece.loopSeconds) / activePiece.loopSeconds;
  const phase = cycle * Math.PI * 2;
  renderSvgState(phase);
  animationId = requestAnimationFrame(draw);
}

function renderSvgState(phase) {
  const variant = pieceVariant(activePiece);
  const engine = pieceEngine(activePiece);
  ringLayer.querySelectorAll(".vj-ring").forEach((ring) => {
    const i = Number(ring.dataset.index);
    const scale = 1 + Math.sin(phase + i * 0.7) * (variant === 2 ? 0.08 : 0.025);
    const rotate = toDeg(phase) * (i % 2 === 0 ? 1 : -1) * (variant === 3 ? 0.25 : 1) + i * 8;
    ring.setAttribute("transform", `rotate(${rotate}) scale(${scale})`);
    ring.setAttribute("stroke-dashoffset", String((phase * (variant === 1 ? 90 : 36) + i * 11) % 200));
  });

  spokeLayer.querySelectorAll(".vj-spoke").forEach((line) => {
    const i = Number(line.dataset.index);
    const angle = variant === 3 ? i * 10 + Math.sin(phase + i) * 12 : toDeg(phase) + i * 7.5;
    const opacity = 0.12 + (0.5 + 0.5 * Math.sin(phase * 2 + i)) * 0.24;
    line.setAttribute("transform", `rotate(${angle})`);
    line.setAttribute("stroke-opacity", String(opacity));
  });

  glyphLayer.querySelectorAll(".vj-glyph").forEach((rect) => {
    const i = Number(rect.dataset.index);
    if (engine === "type-poster") {
      const x = Math.sin(phase + i) * 90;
      const y = (i - 4.5) * 54 + Math.cos(phase * 0.7 + i) * 18;
      rect.setAttribute("transform", `translate(${x} ${y}) rotate(${Math.sin(phase + i) * 8})`);
      return;
    }
    if (engine === "mask-symbols") {
      const orbit = phase + (i / 18) * Math.PI * 2;
      const radius = 130 + (i % 6) * 48;
      rect.setAttribute("transform", `translate(${Math.cos(orbit) * radius} ${Math.sin(orbit) * radius * 0.72}) rotate(${toDeg(phase) + i * 12})`);
      return;
    }
    const orbit = phase + (i / 12) * Math.PI * 2;
    const radius = variant === 2 ? 100 + (i % 6) * 36 : 180 + (i % 4) * 55;
    const x = Math.cos(orbit) * radius;
    const y = Math.sin(orbit * 0.86) * radius * 0.72;
    const angle = toDeg((variant === 1 ? phase : -phase * 1.4) + i * 18);
    rect.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
  });
}

function renderCanvasState(targetCanvas, phase, alpha = false) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = svg.getBoundingClientRect();
  targetCanvas.width = Math.max(2, Math.floor(rect.width * dpr));
  targetCanvas.height = Math.max(2, Math.floor(rect.height * dpr));
  const ctx = targetCanvas.getContext("2d", { alpha });
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!alpha) {
    ctx.fillStyle = "#020202";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  }
  ctx.save();
  ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
  ctx.scale(targetCanvas.width / 1000, targetCanvas.height / 1000);
  drawVectorRecipe(ctx, activePiece, phase, alpha);
  ctx.restore();
}

function drawVectorRecipe(ctx, piece, phase, alpha) {
  const paletteA = cssRgb(piece.palette.slice(0, 3));
  const paletteB = cssRgb(piece.palette.slice(3, 6));
  const variant = pieceVariant(piece);
  ctx.globalCompositeOperation = "lighter";
  const ringCount = variant === 2 ? 5 : 10;
  for (let i = 0; i < ringCount; i += 1) {
    ctx.save();
    ctx.rotate(phase * (i % 2 === 0 ? 1 : -1) + i * 0.14);
    ctx.scale(1 + Math.sin(phase + i * 0.7) * 0.025, 1 + Math.sin(phase + i * 0.7) * 0.025);
    ctx.strokeStyle = i % 2 === 0 ? paletteA : paletteB;
    ctx.globalAlpha = 0.18 + (10 - i) * 0.035;
    ctx.lineWidth = 3 + (i % 4);
    ctx.setLineDash(variant === 0 ? [18 + i * 3, 22 + i * 4] : [6 + i * 2, 34 + i * 5]);
    ctx.lineDashOffset = -((phase * 36 + i * 11) % 200);
    ctx.beginPath();
    ctx.arc(0, 0, variant === 1 ? 44 + i * 54 : 70 + i * 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const spokeCount = variant === 3 ? 18 : 48;
  for (let i = 0; i < spokeCount; i += 1) {
    ctx.save();
    ctx.rotate(phase + i * 0.131);
    ctx.globalAlpha = 0.12 + (0.5 + 0.5 * Math.sin(phase * 2 + i)) * 0.24;
    ctx.strokeStyle = i % 2 === 0 ? paletteA : paletteB;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(variant === 3 ? 520 : 130 + ((i * 19 + hash(piece.date)) % 260), 0);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < 12; i += 1) {
    const orbit = phase + (i / 12) * Math.PI * 2;
    const radius = variant === 2 ? 100 + (i % 6) * 36 : 180 + (i % 4) * 55;
    ctx.save();
    ctx.translate(Math.cos(orbit) * radius, Math.sin(orbit * 0.86) * radius * 0.72);
    ctx.rotate(-phase * 1.4 + i * 0.314);
    ctx.globalAlpha = alpha ? 0.82 : 0.42;
    ctx.strokeStyle = i % 2 === 0 ? paletteA : paletteB;
    ctx.lineWidth = 3;
    if (variant === 1) {
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.bezierCurveTo(-12, -38, 18, -38, 32, 0);
      ctx.bezierCurveTo(12, 38, -18, 38, -32, 0);
      ctx.stroke();
    } else if (variant === 2) {
      ctx.beginPath();
      ctx.arc(0, 0, 16 + (i % 4) * 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-26, -26, 52, 52);
    }
    ctx.restore();
  }
}

function renderContent() {
  document.querySelector("#piece-title").textContent = activePiece.title;
  document.querySelector("#piece-date").textContent = activePiece.date;
  document.querySelector("#detail-title").textContent = activePiece.title;
  document.querySelector("#detail-copy").textContent = activePiece.copy;
  document.querySelector("#loop-length").textContent = `${activePiece.loopSeconds}s`;
  document.querySelector("#why-copy").textContent = activePiece.why;
  document.querySelector("#code-output").textContent = makeRecipe(activePiece);
  renderPurchaseLink(activePiece);
  renderSources();
  renderArchive();
}

function renderSources() {
  const sourceList = document.querySelector("#source-list");
  sourceList.innerHTML = "";
  if (Array.isArray(activePiece.research)) {
    activePiece.research.forEach((entry) => {
      const li = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `Daily Research ${entry.date}`;
      const note = document.createElement("p");
      note.textContent = entry.summary;
      li.append(title, note);
      if (Array.isArray(entry.sources)) {
        entry.sources.forEach((source) => {
          const link = document.createElement("a");
          link.href = source.url;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = source.label;
          const sourceNote = document.createElement("p");
          sourceNote.textContent = source.note;
          li.append(link, sourceNote);
        });
      }
      sourceList.append(li);
    });
  }
  sources.forEach((source) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    const note = document.createElement("p");
    note.textContent = source.note;
    li.append(link, note);
    sourceList.append(li);
  });
}

function renderArchive() {
  const archive = document.querySelector("#archive-list");
  archive.innerHTML = "";
  drops.forEach((piece) => {
    const item = document.createElement("article");
    item.className = "archive-item";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = piece.title;
    button.addEventListener("click", () => {
      activePiece = piece;
      buildSvg(activePiece);
      startTime = performance.now();
      pausedAt = 0;
      renderContent();
    });
    const small = document.createElement("small");
    small.textContent = `${piece.date} / ${piece.loopSeconds}s SVG CSS loop`;
    item.append(button, small);
    archive.append(item);
  });
}

function renderPurchaseLink(piece) {
  const link = document.querySelector("#purchase-link");
  const note = document.querySelector("#purchase-note");
  const itemUrl = piece.purchaseUrl || purchaseConfig.url;
  const enabled = Boolean(itemUrl && purchaseConfig.enabled);
  link.textContent = piece.purchaseLabel || purchaseConfig.label;
  link.href = enabled ? itemUrl : "#";
  link.target = enabled ? "_blank" : "";
  link.rel = enabled ? "noreferrer" : "";
  link.setAttribute("aria-disabled", String(!enabled));
  note.textContent = piece.purchaseNote || purchaseConfig.note;
}

document.querySelector("#toggle-play").addEventListener("click", () => {
  isPaused = !isPaused;
  const icon = document.querySelector("#play-icon");
  if (isPaused) {
    pausedAt = (performance.now() - startTime) / 1000;
    icon.textContent = ">";
  } else {
    startTime = performance.now() - pausedAt * 1000;
    icon.textContent = "II";
  }
});

document.querySelector("#toggle-motion").addEventListener("click", () => {
  calmMotion = !calmMotion;
  document.querySelector("#toggle-motion").style.color = calmMotion ? "var(--accent-2)" : "";
});

document.querySelector("#save-frame").addEventListener("click", () => {
  const elapsed = isPaused ? pausedAt : (performance.now() - startTime) / 1000;
  const phase = (((elapsed % activePiece.loopSeconds) / activePiece.loopSeconds) * Math.PI * 2);
  renderCanvasState(exportCanvas, phase);
  const link = document.createElement("a");
  link.download = `${activePiece.date}-${slugify(activePiece.title)}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});

document.querySelector("#save-video").addEventListener("click", () => recordLoopVideo(false).catch(markVideoError));
document.querySelector("#save-alpha").addEventListener("click", () => recordLoopVideo(true).catch(markAlphaError));

document.querySelector("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(makeRecipe(activePiece));
  const button = document.querySelector("#copy-code");
  button.textContent = "COPIED";
  window.setTimeout(() => {
    button.textContent = "CODE";
  }, 1200);
});

document.querySelector("#save-project").addEventListener("click", () => {
  downloadText(
    `${activePiece.date}-${slugify(activePiece.title)}.svg-css-vj.json`,
    JSON.stringify({
      project: "daily-svg-css-vj-loop",
      version: 1,
      date: activePiece.date,
      title: activePiece.title,
      loopSeconds: activePiece.loopSeconds,
      palette: activePiece.palette,
      sources,
      recipe: makeRecipe(activePiece),
    }, null, 2),
    "application/json",
  );
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#tab-${tab.dataset.tab}`).classList.add("is-active");
  });
});

async function recordLoopVideo(alpha) {
  if (videoRecorder?.state === "recording") return;
  if (!exportCanvas.captureStream || !window.MediaRecorder) throw new Error("Recording unsupported.");
  const format = alpha ? pickAlphaVideoFormat() : pickVideoFormat();
  if (!format) throw new Error("No video format.");
  const button = document.querySelector(alpha ? "#save-alpha" : "#save-video");
  const chunks = [];
  const stream = exportCanvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    videoBitsPerSecond: alpha ? 10_000_000 : 8_000_000,
  });
  videoRecorder = recorder;
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  const finished = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
  button.disabled = true;
  button.classList.add("is-recording");
  startTime = performance.now();
  pausedAt = 0;
  isPaused = false;
  document.querySelector("#play-icon").textContent = "II";
  recordingStartedAt = performance.now();

  const renderFrame = () => {
    const elapsed = (performance.now() - recordingStartedAt) / 1000;
    const phase = ((elapsed % activePiece.loopSeconds) / activePiece.loopSeconds) * Math.PI * 2;
    renderCanvasState(exportCanvas, phase, alpha);
    alphaFrameId = requestAnimationFrame(renderFrame);
  };
  renderFrame();
  updateRecordingProgress(button);
  recorder.start(250);
  window.setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, activePiece.loopSeconds * 1000);
  await finished;
  cancelAnimationFrame(alphaFrameId);
  cancelAnimationFrame(recordingProgressId);
  stream.getTracks().forEach((track) => track.stop());
  downloadBlob(
    `${activePiece.date}-${slugify(activePiece.title)}${alpha ? "-alpha" : ""}.${format.extension}`,
    new Blob(chunks, { type: format.mimeType }),
  );
  button.classList.remove("is-recording");
  button.textContent = alpha ? "WEBM" : format.extension.toUpperCase();
  window.setTimeout(() => {
    button.textContent = alpha ? "ALPHA" : "MP4";
    button.disabled = false;
    videoRecorder = null;
  }, 1400);
}

function updateRecordingProgress(button) {
  const elapsed = (performance.now() - recordingStartedAt) / 1000;
  const progress = Math.min(99, Math.floor((elapsed / activePiece.loopSeconds) * 100));
  button.textContent = `REC ${progress}%`;
  recordingProgressId = requestAnimationFrame(() => updateRecordingProgress(button));
}

function markVideoError() {
  const button = document.querySelector("#save-video");
  button.textContent = "NO VIDEO";
  button.disabled = false;
  window.setTimeout(() => { button.textContent = "MP4"; }, 1600);
}

function markAlphaError() {
  const button = document.querySelector("#save-alpha");
  button.textContent = "NO ALPHA";
  button.disabled = false;
  window.setTimeout(() => { button.textContent = "ALPHA"; }, 1600);
}

function pickVideoFormat() {
  const candidates = [
    { mimeType: "video/mp4;codecs=h264", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType));
}

function pickAlphaVideoFormat() {
  const candidates = [
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType));
}

function pickPiece(date) {
  const direct = drops.find((piece) => piece.date === date);
  if (direct) return direct;
  const seed = hash(date);
  const hueA = fract(seed * 0.0183);
  const hueB = fract(hueA + 0.38);
  return {
    date,
    title: `Generated Vector Loop ${date.replaceAll("-", ".")}`,
    loopSeconds: [8, 12, 16, 20][seed % 4],
    palette: [...hsv(hueA, 0.7, 0.95), ...hsv(hueB, 0.68, 0.86)],
    copy: "日付シードから生成されるSVG/CSS VJループ。ベクター素材として軽量に公開できる。",
    why: "SVG/CSSはロゴモーション、線形パターン、ベクター抽象表現に向く。まずはフレームを作り、後から素材ごとの図形設計を詰める。",
  };
}

function pieceVariant(piece) {
  const title = String(piece.title || "").toLowerCase();
  if (title.includes("glyph") || title.includes("logo")) return 3;
  if (title.includes("ring") || title.includes("signal")) return 1;
  if (title.includes("bloom") || title.includes("dash")) return 2;
  return hash(`${piece.date}:${piece.title}:svg`) % 4;
}

function pieceEngine(piece) {
  return piece.engine || "vector-orbits";
}

function makeRecipe(piece) {
  return `<!-- Daily SVG / CSS VJ Loop -->
<!-- Date: ${piece.date} -->
<!-- Title: ${piece.title} -->
<!-- Loop seconds: ${piece.loopSeconds} -->
<!-- Engine: ${pieceEngine(piece)} -->
<!-- Variant: ${pieceVariant(piece)} -->
<!-- Shapes: rings, spokes, orbiting glyph rectangles -->
<!-- Palette A: ${cssRgb(piece.palette.slice(0, 3))} -->
<!-- Palette B: ${cssRgb(piece.palette.slice(3, 6))} -->`;
}

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
  const table = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ];
  return table[i % 6].map((n) => Number(n.toFixed(3)));
}

function cssRgb(values) {
  return `rgb(${values.map((value) => Math.round(value * 255)).join(", ")})`;
}

function toDeg(value) {
  return value * 180 / Math.PI;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadText(filename, text, type) {
  downloadBlob(filename, new Blob([text], { type }));
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("beforeunload", () => cancelAnimationFrame(animationId));
