import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as m from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 380;

// World layout, about 1 px per unit, z up.
const PLATE = { x: -152, y: -88, w: 300, d: 168, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const TRAY = { x: -140, y: -60, w: 126, d: 104, r: 5 };
const TRAY_H = 7;
const COLS = 8;
const ROWS = 6;
const M = COLS * ROWS;
const SITE = (i) => [-128 + 14.2 * (i % COLS), -46 + 15.6 * Math.floor(i / COLS)];
const WELL_R = 5.2;
const COL_R = 3.4;
const COL_Z = TRAY_H - 1.2;

const DIAL = [22, -62];
const DIAL_R = 18;
const DIAL_Z = 40;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const DIAL_SPAN = (5 * Math.PI) / 3;
const DIAL_RANGE = 2.5;

const RACK = { x: 92, y: -60, w: 34, d: 132, r: 3 };
const RACK_H = 6;
const BOARD = { x: 94, y: -58, w: 5, d: 128, r: 1.2 };
const BOARD_TOP = 66;
const ROD_X = 112;
const ROD_Y = (i) => -50 + 9.6 * i;
const ROD_R = 2.3;
const SOCKET_Z = RACK_H + 4;
const PER_DECADE = 12;

const KNOB_BLOCK = { x: 6, y: 42, w: 46, d: 28, r: 3 };
const KNOB_BLOCK_H = 9;
const KNOB = [29, 56];
const KNOB_R = 7;
const KNOB_TOP = KNOB_BLOCK_H + 6;
const DETENT = (index) => ((index - 2) * Math.PI) / 3;

const TAU_START = 3;
const SAMPLES = 20000;
const HIST = m.TAUS.map((tau, index) => m.histogram(M, tau, SAMPLES, 11 + index));
const ALPHA = m.alphaOf();

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [BOARD.x, BOARD.y, BOARD_TOP], [BOARD.x, BOARD.y + BOARD.d, BOARD_TOP], [DIAL[0], DIAL[1] - DIAL_R, DIAL_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const columnHeight = (n) => Math.min(58, 2 + 3.6 * Math.log2(n));
const levelOf = (count) => PER_DECADE * Math.log10(count + 1);

function columnSvg(i, n) {
  const [x, y] = SITE(i);
  const h = columnHeight(n);
  return S(k.cylinder(x, y, COL_R, COL_Z, h, P, 18, 0.4), { tone: "hi", crease: "lo" });
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -78, y: PLATE.y + PLATE.d - 16, w: 76, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  const label = { x: -134, y: PLATE.y + PLATE.d - 24, w: 44, d: 15, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  [[30, 4.6], [22, 7.6], [26, 10.6]].forEach(([w, y]) => out.push(L(k.lineOnTop([label.x + 6, label.y + y], [label.x + 6 + w, label.y + y], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// The summed reading runs from the tray to the dial post, and the sample from the dial to the rack.
function wires() {
  return [
    k.wireSvg(at([TRAY.x + TRAY.w, -30, 0]), at([DIAL[0] - 5, DIAL[1] + 1, 0]), { via: [at([4, -30, 0]), at([4, DIAL[1] + 1, 0])], tone: "lo" }),
    k.wireSvg(at([DIAL[0] + 5, DIAL[1] + 1, 0]), at([RACK.x, RACK.y + 6, 0]), { via: [at([60, DIAL[1] + 1, 0]), at([60, RACK.y + 6, 0])], tone: "lo" }),
  ].join("");
}

function tray(n) {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TRAY, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(TRAY, 0, TRAY_H, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, 2.4, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3.2), TRAY_H, P, 5), { tone: "faint" }));
  out.push(D(k.corners(TRAY, 2.2).map(([x, y]) => at([x, y, TRAY_H])), { size: 0.45 }));
  const order = byDepth(Array.from({ length: M }, (_, i) => [...SITE(i), i])).map((point) => point[2]);
  for (const i of order) {
    const [x, y] = SITE(i);
    out.push(`<g data-site="${i}">`);
    out.push(L(k.ring(x, y, WELL_R, TRAY_H, P, 24), { tone: "lo" }));
    out.push(L(k.ring(x, y, WELL_R - 0.9, TRAY_H, P, 24), { tone: "faint" }));
    out.push(`<g data-col="${i}">${columnSvg(i, n[i])}</g>`);
    out.push(`</g>`);
  }
  return out.join("");
}

function dialStand() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 9, 0, 2.4, P, 32, 0.4), { tone: "lo" }));
  out.push(D([0, 1, 2, 3].map((q) => at([x + Math.cos(q * Math.PI / 2 + 0.6) * 7, y + Math.sin(q * Math.PI / 2 + 0.6) * 7, 2.4])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 5, 2.4, 4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.8, 6.4, DIAL_Z - 6.4 - 4, P, 20), { tone: "mid", crease: "none" }));
  out.push(L([16, 26].map((z) => k.sideArc(x, y, 2.8, z, P, 14)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 6, DIAL_Z - 4, 4, P, 28, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.2, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.2, 25, 5, DIAL_TOP, [1.3, 2.8], P, -DIAL_SPAN / 2, DIAL_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([x, y - DIAL_R + 2.2], [x, y - DIAL_R + 6.4], DIAL_TOP, P), { tone: "hi" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 8.5], DIAL_TOP, P, "x"), "log G", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (value) => {
  const share = Math.max(-1, Math.min(1, value / DIAL_RANGE));
  const angle = (share * DIAL_SPAN) / 2;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4], [x + Math.sin(angle) * (DIAL_R - 2.4), y - Math.cos(angle) * (DIAL_R - 2.4)], DIAL_TOP + 0.2, P);
};

const knobPointer = (angle) => {
  const [x, y] = KNOB;
  return k.lineOnTop([x - Math.sin(angle) * 1.6, y + Math.cos(angle) * 1.6], [x + Math.sin(angle) * (KNOB_R - 1), y - Math.cos(angle) * (KNOB_R - 1)], KNOB_TOP, P);
};

function knobBlock() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(KNOB_BLOCK, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(KNOB_BLOCK, 0, KNOB_BLOCK_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(KNOB_BLOCK, 3, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(KNOB_BLOCK, 3).map(([x, y]) => at([x, y, KNOB_BLOCK_H])), { size: 0.45 }));
  const [x, y] = KNOB;
  const detents = k.radialTicks(x, y, KNOB_R + 4.6, 4, 1, KNOB_BLOCK_H, [2, 2], P, DETENT(0), DETENT(4) - DETENT(0));
  out.push(L(k.ring(x, y, KNOB_R + 4.6, KNOB_BLOCK_H, P, 48), { tone: "faint" }));
  out.push(L(detents.major, { tone: "mid" }));
  out.push(S(k.cylinder(x, y, KNOB_R + 1.4, KNOB_BLOCK_H, 1.4, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, KNOB_R, KNOB_BLOCK_H + 1.4, KNOB_TOP - KNOB_BLOCK_H - 1.4, P, 36, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(x, y, KNOB_R, KNOB_BLOCK_H + 1.4, KNOB_TOP, 40, P), { tone: "lo" }));
  out.push(`<path data-part="knob" class="iso-line" data-tone="hi" data-free="end" d="${knobPointer(DETENT(TAU_START))}"/>`);
  out.push(D([at([x, y, KNOB_TOP])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

function rodSvg(i, level, lit) {
  const y = ROD_Y(i);
  const h = Math.max(0.6, level);
  return S(k.cylinder(ROD_X, y, ROD_R, SOCKET_Z, h, P, 18), { tone: "hi", crease: "lo" }) + S(k.cylinder(ROD_X, y, ROD_R + 0.7, SOCKET_Z + h, 1.4, P, 18), { tone: lit ? "hi" : "mid", lit });
}

function rack(counts) {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(RACK, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(RACK, 0, RACK_H, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(RACK, 3).map(([x, y]) => at([x, y, RACK_H])), { size: 0.45 }));
  const decades = [1, 2, 3, 4].map((d) => k.sideSeam(BOARD, SOCKET_Z + PER_DECADE * d, P, 3)).join("");
  out.push(S(k.slabOf(BOARD, RACK_H, BOARD_TOP - RACK_H, P, 3, 0.5), { tone: "mid", inner: L(decades, { tone: "faint" }) }));
  out.push(L(k.lineOnTop([BOARD.x + BOARD.w / 2, ROD_Y(6) - 0.01], [BOARD.x + BOARD.w / 2, ROD_Y(6) + 0.01], BOARD_TOP, P), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(BOARD, 1.2), BOARD_TOP, P, 3), { tone: "faint" }));
  for (let i = 0; i < m.BINS; i++) {
    const y = ROD_Y(i);
    out.push(`<g data-bin="${i}">`);
    out.push(S(k.cylinder(ROD_X, y, ROD_R + 1.6, RACK_H, SOCKET_Z - RACK_H, P, 22, 0.3), { tone: "mid" }));
    out.push(L(k.ring(ROD_X, y, ROD_R + 0.5, SOCKET_Z, P, 18), { tone: i === 6 ? "mid" : "faint" }));
    out.push(`<g data-rod="${i}">${rodSvg(i, levelOf(counts[i]), false)}</g>`);
    out.push(`</g>`);
  }
  return out.join("");
}

// Start from a stationary state of the same model, so the first picture is typical.
const random = m.rng(5);
const n0 = Array.from({ length: M }, () => 1 + 9 * random());
for (let t = 0; t < 3000; t++) m.step(n0, random);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench instrument for the gut-microbiome growth model. A tray of 48 wells stands for 48 sites on the gut wall; a column in each well rises with the log of that site's abundance, and every tick each site halves, stays or doubles at random. A dial reads the log growth rate of the summed abundance over one sampling interval, set by a knob. Each sample lifts one of 13 rods on a rack, and the rod tops form the tent-shaped log growth-rate distribution.",
  body: [
    plate(),
    wires(),
    tray(n0),
    dialStand(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
    knobBlock(),
    rack(HIST[TAU_START]),
  ],
});

const live = `
${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}
const P = ${JSON.stringify(P)};
const M = ${M}, COLS = ${COLS}, COL_R = ${COL_R}, COL_Z = ${COL_Z};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, DIAL_SPAN = ${DIAL_SPAN}, DIAL_RANGE = ${DIAL_RANGE};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP};
const ROD_X = ${ROD_X}, ROD_R = ${ROD_R}, SOCKET_Z = ${SOCKET_Z}, PER_DECADE = ${PER_DECADE};
const HIST = ${JSON.stringify(HIST)};
const SITE = ${SITE.toString()};
const ROD_Y = ${ROD_Y.toString()};
const DETENT = ${DETENT.toString()};
const columnHeight = ${columnHeight.toString()};
const levelOf = ${levelOf.toString()};
const columnSvg = ${columnSvg.toString().replace(/k\./g, "").replace("S(", "solidSvg(")};
const rodSvg = ${rodSvg.toString().replace(/k\./g, "").replace(/S\(/g, "solidSvg(")};
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const knobPointer = ${knobPointer.toString().replace("k.lineOnTop", "lineOnTop")};
const TICKS_PER_SECOND = 24;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const needle = svg.querySelector('[data-part="needle"]');
const knob = svg.querySelector('[data-part="knob"]');
const cols = [...svg.querySelectorAll("[data-col]")].sort((a, b) => a.dataset.col - b.dataset.col);
const rods = [...svg.querySelectorAll("[data-rod]")].sort((a, b) => a.dataset.rod - b.dataset.rod);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const random = rng(${Date.now() % 100000} ^ 0);
const n = ${JSON.stringify(n0)};
const counts = HIST.map((list) => list.slice());
let tauIndex = ${TAU_START}, N = total(n), ticks = 0, owed = 0, last = 0, frame = 0, visible = false;
let reading = 0, needleAt_ = 0, knobAngle = DETENT(tauIndex), litBin = -1, litFor = 0;
let levels = counts[tauIndex].map(levelOf);
let touring = true, tourClock = 0, idleTimer = 0;
const TOUR = [3, 4, 2, 1, 0, 1, 2];
let tourStep = 0;
const shown = { cols: n.map(columnHeight), rods: levels.map((v) => -1) };

function sample() {
  const next = total(n);
  reading = Math.log10(next / N);
  N = next;
  const bin = binOf(reading);
  counts[tauIndex][bin]++;
  litBin = bin;
  litFor = 0.9;
}
function setTau(index) {
  if (index === tauIndex) return;
  tauIndex = index;
  ticks = 0;
  N = total(n);
}
const say = () => {
  const tau = TAUS[tauIndex];
  const text = "τ = " + tau + " Δt · log₁₀G = " + (reading.toFixed(2) === "-0.00" || reading >= 0 ? "+" : "−") + Math.abs(reading).toFixed(2) + " · N = " + Math.round(N);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(tau));
  stage.setAttribute("aria-valuetext", text);
};
function draw() {
  for (let i = 0; i < M; i++) {
    const h = columnHeight(n[i]);
    if (Math.abs(h - shown.cols[i]) > 0.05) { shown.cols[i] = h; cols[i].innerHTML = columnSvg(i, n[i]); }
  }
  for (let i = 0; i < rods.length; i++) {
    const lit = i === litBin && litFor > 0;
    const key = levels[i].toFixed(2) + (lit ? "*" : "");
    if (shown.rods[i] !== key) { shown.rods[i] = key; rods[i].innerHTML = rodSvg(i, levels[i], lit); }
  }
  needle.setAttribute("d", needleAt(needleAt_));
  knob.setAttribute("d", knobPointer(knobAngle));
  say();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (touring) {
    tourClock += dt;
    if (tourClock > 6) { tourClock = 0; tourStep = (tourStep + 1) % TOUR.length; setTau(TOUR[tourStep]); }
  }
  owed += dt * TICKS_PER_SECOND;
  while (owed >= 1) {
    owed -= 1;
    step(n, random);
    if (++ticks >= TAUS[tauIndex]) { ticks = 0; sample(); }
  }
  const ease = (from, to, seconds) => from + (to - from) * (1 - Math.exp(-dt / seconds));
  needleAt_ = ease(needleAt_, reading, 0.18);
  knobAngle = ease(knobAngle, DETENT(tauIndex), 0.2);
  litFor = Math.max(0, litFor - dt);
  const want = counts[tauIndex].map(levelOf);
  levels = levels.map((v, i) => { const next = ease(v, want[i], 0.35); return Math.abs(next - want[i]) < 0.01 ? want[i] : next; });
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (index) => {
  touring = false;
  setTau(Math.max(0, Math.min(TAUS.length - 1, index)));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = true; tourClock = 0; }, 5000);
  if (still.matches) { knobAngle = DETENT(tauIndex); levels = counts[tauIndex].map(levelOf); draw(); }
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.max(0, Math.min(0.999, (event.clientX - box.left) / box.width));
  steer(Math.floor(share * TAUS.length));
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = tauIndex + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = tauIndex - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = TAUS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Gut-wall growth bench",
  hint: "Move across to set the interval · ← → keys",
  readout: `τ = ${m.TAUS[TAU_START]} Δt · log₁₀G = +0.00`,
  keys: [
    { mark: "raised", label: "48 wells = 48 gut-wall sites; column height = log₂ of that site's abundance n" },
    { mark: "lit", label: "Dial needle: log₁₀ of the summed abundance's growth over τ ticks; lit cap: the bin it lands in" },
    { mark: "edge", label: "Rack: one rod per bin of log₁₀G, height = log₁₀(count); one faint rule per decade" },
  ],
  caption: `Each tick (Δt, one bacterial generation) every site halves, stays or doubles with probability 0.20, 0.68 and 0.12, plus one immigrant: n ← g·n + 1. That fixes the power-law exponent at α = ${ALPHA.toFixed(2)} (⟨g^α⟩ = 1). The dial reads only the sum N over all ${M} sites, every τ ticks, as log₁₀ G = log₁₀ N(t+τ)/N(t). The rack starts with ${SAMPLES.toLocaleString("en")} samples per τ from the same model and adds each live one. Because heights are logarithmic, straight rod-top flanks mean a Laplace (tent) distribution; turning τ up widens the tent, as in Maskawa et al., Phys. Rev. Research 7, 013269 (2025), Fig. 4(a). The paper uses M = 1000; here M = ${M}.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Sampling interval τ: arrow keys change it" aria-valuemin="1" aria-valuemax="100" aria-valuenow="${m.TAUS[TAU_START]}">${svg}</div>`,
});

const name = theme === "light" ? "gut-bench-light.html" : "gut-bench.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Gut-wall growth bench", theme, body, script: kitScript() + live }));
console.log("wrote", name);

// One page for sharing: it follows the viewer's theme (an explicit data-theme on <html>, else the system setting).
// `index.html` is a full document for GitHub Pages; `artifact.html` is the same page without the document skeleton.
const AUTO_CSS = `
:root{--page-bg:#0b0b0b;color-scheme:dark}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--page-bg:#f2f2ef;color-scheme:light}}
:root[data-theme="light"]{--page-bg:#f2f2ef;color-scheme:light}
:root[data-theme="dark"]{--page-bg:#0b0b0b;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--page-bg)}
.iso.bench{background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;padding-inline:16px;padding-block:48px 72px}
.bench .iso-page{width:min(650px,100%);margin:0 auto}
`;
const AUTO_THEME = `
const benchRoot = document.querySelector(".iso.bench");
const prefersLight = matchMedia("(prefers-color-scheme: light)");
const applyTheme = () => {
  const chosen = document.documentElement.dataset.theme;
  benchRoot.dataset.theme = chosen === "light" || (chosen !== "dark" && prefersLight.matches) ? "light" : "dark";
};
applyTheme();
prefersLight.addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
`;
const autoScript = `<script type="module">${(AUTO_THEME + kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>`;
const autoBody = `<title>Gut-wall growth bench</title><style>${k.ISO_CSS}${AUTO_CSS}</style><div class="iso bench" data-theme="dark"><main class="iso-page">${body}</main></div>${autoScript}`;
writeFileSync(join(HERE, "artifact.html"), autoBody);
writeFileSync(join(HERE, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${autoBody.replace("</style>", "</style></head><body>")}</body></html>`);
console.log("wrote index.html, artifact.html");
