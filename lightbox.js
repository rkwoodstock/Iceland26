// ライトボックス: テーブルにスライドを並べる / ドラッグで動かす / ルーペでのぞく / 映写する

const $ = sel => document.querySelector(sel);
const surface = $("#surface");
const slidesEl = $("#slides");
const table = $("#table");
const lens = $("#lens");
const world = $("#lens-world");
const N = FILMS.length;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

document.querySelectorAll(".stock").forEach(e => { e.textContent = FILM_STOCK; });
document.querySelectorAll(".camera").forEach(e => { e.textContent = FILM_CAMERA; });
document.querySelectorAll(".count").forEach(e => { e.textContent = `${N} slides`; });

// ---------- スライドを作る ----------
const state = FILMS.map(() => ({ x: 0, y: 0, r: 0 }));
const els = FILMS.map((f, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "slide";
  b.setAttribute("aria-label", `Project frame ${pad2(f.id)}${f.title ? ` — ${f.title}` : ""}`);
  b.style.setProperty("--delay", `${i * 28}ms`);
  b.innerHTML = mountHTML(f);
  slidesEl.appendChild(b);
  return b;
});
slidesEl.classList.add("pre");

// ---------- 並べ方 ----------
let mode = "scatter"; // 初期状態は散らかした置き方
let seed = 1;
let S = 160;
function layout() {
  const W = surface.clientWidth;
  const cols = W >= 1150 ? 7 : W >= 900 ? 6 : W >= 700 ? 5 : W >= 480 ? 4 : 3;
  const pad = Math.max(14, W * 0.035);
  const g = W < 480 ? 0.2 : 0.3;
  S = (W - 2 * pad) / (cols + (cols - 1) * g);
  const gap = S * g;
  const rows = Math.ceil(N / cols);
  const H = Math.round(2 * pad + rows * S + (rows - 1) * gap * 0.8);
  surface.style.height = `${H}px`;
  slidesEl.style.setProperty("--s", `${S}px`);

  const order = FILMS.map((_, i) => i).sort((a, b) => seeded(a * 7 + seed * 131) - seeded(b * 7 + seed * 131));
  FILMS.forEach((f, i) => {
    const rnd = k => seeded(f.id * 31 + k + seed * 977);
    const c = i % cols, row = Math.floor(i / cols);
    const gx = pad + c * (S + gap), gy = pad + row * (S + gap * 0.8);
    if (mode === "tidy") {
      state[i] = { x: gx, y: gy, r: (rnd(1) - 0.5) * 0.8 };
    } else if (mode === "scatter") {
      // 並び順をシャッフルしたマスに、大きくずらして置く（偏りすぎない無造作さ）
      const cell = order[i];
      const sc = cell % cols, sr = Math.floor(cell / cols);
      const sx = pad + sc * (S + gap) + (rnd(1) - 0.5) * (S + gap) * 1.1;
      const sy = pad + sr * (S + gap * 0.8) + (rnd(2) - 0.5) * (S + gap) * 0.9;
      state[i] = { x: clamp(sx, 0, W - S), y: clamp(sy, 0, H - S), r: (rnd(3) - 0.5) * 50 };
    } else {
      state[i] = { x: gx + (rnd(1) - 0.5) * gap * 0.4, y: gy + (rnd(2) - 0.5) * gap * 0.35, r: (rnd(3) - 0.5) * 5 };
    }
    els[i].style.zIndex = mode === "scatter" ? Math.floor(rnd(4) * 40) + 1 : "";
    place(i);
  });
  syncWorld();
  clearTimeout(layout.t);
  layout.t = setTimeout(() => { syncWorld(); if (lensMotion.visible && !surface.matches(":hover")) parkLens(); }, 950);
}
function place(i) {
  const s = state[i], el = els[i];
  el.style.setProperty("--x", `${s.x}px`);
  el.style.setProperty("--y", `${s.y}px`);
  el.style.setProperty("--r", `${s.r}deg`);
}

let resizeT;
let lastW = surface.clientWidth;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (surface.clientWidth === lastW) return;
    lastW = surface.clientWidth;
    layout();
  }, 150);
});

function setMode(m) {
  if (m === "scatter") seed += 1;
  mode = m;
  layout();
}
$("#btn-tidy").addEventListener("click", () => setMode("tidy"));
$("#btn-scatter").addEventListener("click", () => setMode("scatter"));

// ---------- ドラッグ（マウス・ペン） ----------
let drag = null;
let zTop = 100;
let suppressClick = false;
els.forEach((el, i) => {
  el.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    drag = { i, el, sx: e.clientX, sy: e.clientY, ox: state[i].x, oy: state[i].y, r0: state[i].r, lastX: e.clientX, tilt: 0, moved: false };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", e => {
    if (!drag || drag.el !== el) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      el.classList.add("is-dragging", "is-lifted");
      el.style.zIndex = ++zTop;
      hideLens();
    }
    const W = surface.clientWidth, H = surface.clientHeight;
    state[i].x = clamp(drag.ox + dx, -S * 0.3, W - S * 0.7);
    state[i].y = clamp(drag.oy + dy, -S * 0.3, H - S * 0.7);
    // 動かした向きに少しだけ傾く（手で持っている感じ）
    const vx = e.clientX - drag.lastX;
    drag.lastX = e.clientX;
    drag.tilt += (clamp(vx * 0.6, -9, 9) - drag.tilt) * 0.25;
    state[i].r = drag.r0 + drag.tilt;
    place(i);
  });
  const end = () => {
    if (!drag || drag.el !== el) return;
    if (drag.moved) {
      suppressClick = true;
      state[i].r = drag.r0 + drag.tilt * 0.3;
      el.classList.remove("is-dragging");
      place(i);
      requestAnimationFrame(() => el.classList.remove("is-lifted"));
      setTimeout(syncWorld, 50);
    }
    drag = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("click", e => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    openProjector(i);
  });
});

// ---------- ルーペ ----------
const ZOOM = 3;
let loupeOn = finePointer;
const loupeBtn = $("#btn-loupe");
const hiRes = new Set();
function setLoupe(on) {
  loupeOn = on && finePointer;
  loupeBtn.setAttribute("aria-pressed", String(loupeOn));
  surface.classList.toggle("loupe-active", loupeOn);
  if (!loupeOn) hideLens();
  else if (slidesEl.classList.contains("placed") || !slidesEl.classList.contains("pre")) parkLens();
}
loupeBtn.addEventListener("click", () => setLoupe(!loupeOn));

function syncWorld() {
  if (!finePointer) return;
  const clone = slidesEl.cloneNode(true);
  clone.removeAttribute("id");
  clone.classList.remove("pre");
  clone.querySelectorAll(".slide").forEach(s => s.classList.remove("is-lifted", "is-dragging", "is-away"));
  world.replaceChildren(clone);
  world.style.width = `${surface.clientWidth}px`;
  world.style.height = `${surface.clientHeight}px`;
  hiRes.forEach(i => useHiRes(i, true));
}
// ルーペの下に来たコマだけ高解像度のスキャンに差し替える
function useHiRes(i, force) {
  if (hiRes.has(i) && !force) return;
  hiRes.add(i);
  const img = world.querySelectorAll(".slide")[i]?.querySelector("img");
  if (img) img.src = FILMS[i].file;
}
function hideLens() { lens.classList.remove("is-on"); lensMotion.visible = false; }

// ルーペの動き: カーソル位置を目標に、毎フレーム少しずつ追いかける（なめらかな慣性）。
// 位置は transform を直接書き換える（CSS変数だと中の複製スライド全体の再計算が走り重くなる）
const lensMotion = { x: 0, y: 0, tx: 0, ty: 0, k: 0.3, running: false, visible: false, R: 0, ox: 0, oy: 0 };
function measureLens() {
  lensMotion.R = lens.offsetWidth / 2;
  lensMotion.ox = surface.offsetLeft; // .table を基準にした面の位置
  lensMotion.oy = surface.offsetTop;
}
function applyLens(px, py) {
  const m = lensMotion;
  lens.style.transform = `translate3d(${px + m.ox}px, ${py + m.oy}px, 0)`;
  world.style.transform = `translate3d(${m.R - px * ZOOM}px, ${m.R - py * ZOOM}px, 0) scale(${ZOOM})`;
}
function lensTick() {
  const m = lensMotion;
  m.x += (m.tx - m.x) * m.k;
  m.y += (m.ty - m.y) * m.k;
  const done = Math.abs(m.tx - m.x) < 0.2 && Math.abs(m.ty - m.y) < 0.2;
  if (done) { m.x = m.tx; m.y = m.ty; }
  applyLens(m.x, m.y);
  if (done) m.running = false;
  else requestAnimationFrame(lensTick);
}
// k: 追従の速さ（0〜1）。snap: その場に瞬間移動
function lensTo(px, py, k, snap) {
  const m = lensMotion;
  m.tx = px; m.ty = py; m.k = reduceMotion ? 1 : k;
  if (snap) { m.x = px; m.y = py; }
  if (!m.running) { m.running = true; requestAnimationFrame(lensTick); }
}

// テーブルの外にカーソルが出たら、ルーペを右下の隅へゆっくり置きに行く
function parkLens() {
  if (!loupeOn) return;
  measureLens();
  const m = lensMotion;
  const px = surface.clientWidth - m.R * 0.95, py = surface.clientHeight - m.R * 0.9;
  lensTo(px, py, 0.08, !m.visible);
  m.visible = true;
  lens.classList.add("is-on");
}

surface.addEventListener("pointermove", e => {
  if (!loupeOn || e.pointerType !== "mouse" || (drag && drag.moved)) return;
  const sr = surface.getBoundingClientRect();
  if (!lensMotion.R) measureLens();
  // 見えていなかったときはその場に出す。置いてあったときは手元まで滑らせる
  lensTo(e.clientX - sr.left, e.clientY - sr.top, 0.3, !lensMotion.visible);
  lensMotion.visible = true;
  lens.classList.add("is-on");
  const s = e.target.closest && e.target.closest(".slide");
  if (s) useHiRes(els.indexOf(s));
});
surface.addEventListener("pointerleave", () => { if (!(drag && drag.moved)) parkLens(); });
window.addEventListener("resize", () => { if (lensMotion.visible) parkLens(); });
setLoupe(loupeOn);

// ---------- 映写 ----------
const proj = $("#projector");
const pimg = $("#proj-img");
const shutter = $("#proj-shutter");
let cur = -1;
let lastFocus = null;

function caption(i) {
  const f = FILMS[i];
  $("#proj-count").textContent = `№ ${pad2(f.id)} / ${N}`;
  $("#proj-title").textContent = f.title || "";
  $("#proj-meta").textContent = `${FILM_CAMERA} · ${FILM_STOCK}`;
  pimg.alt = f.title || `Film frame ${pad2(f.id)}`;
}
function loadHi(i) {
  const f = FILMS[i];
  const im = new Image();
  im.src = f.file;
  (im.decode ? im.decode() : Promise.resolve()).then(() => { if (cur === i) pimg.src = f.file; }).catch(() => {});
  [i - 1, i + 1].forEach(j => { new Image().src = FILMS[(j + N) % N].file; });
}
// テーブル上の窓の位置へ戻す/そこから出すための transform
function fromSlide(i) {
  const f = FILMS[i];
  const w = els[i].querySelector(".mount-window").getBoundingClientRect();
  const fr = pimg.getBoundingClientRect();
  const ww = (f.portrait ? 0.48 : 0.72) * S, wh = (f.portrait ? 0.72 : 0.48) * S;
  const dx = w.left + w.width / 2 - (fr.left + fr.width / 2);
  const dy = w.top + w.height / 2 - (fr.top + fr.height / 2);
  return `translate(${dx}px, ${dy}px) rotate(${state[i].r}deg) scale(${ww / fr.width}, ${wh / fr.height})`;
}

async function openProjector(i) {
  if (cur !== -1) return;
  lastFocus = document.activeElement;
  cur = i;
  hideLens();
  pimg.src = FILMS[i].thumb;
  caption(i);
  proj.hidden = false;
  if (window.siteLenis) window.siteLenis.stop();
  document.documentElement.style.overflow = "hidden";
  try { await pimg.decode(); } catch (e) {}
  pimg.style.transition = "none";
  pimg.style.transformOrigin = "50% 50%";
  if (!reduceMotion) pimg.style.transform = fromSlide(i);
  els[i].classList.add("is-away");
  pimg.getBoundingClientRect();
  requestAnimationFrame(() => {
    pimg.style.transition = "transform 0.95s var(--ease-out)";
    pimg.style.transform = "none";
    proj.classList.add("is-open");
  });
  loadHi(i);
  $("#proj-close").focus({ preventScroll: true });
  showControls();
}

function closeProjector() {
  if (cur === -1) return;
  const i = cur;
  proj.classList.remove("is-open", "hide-controls");
  clearTimeout(hideTimer);
  pimg.style.transition = "transform 0.7s var(--ease-io)";
  if (!reduceMotion) pimg.style.transform = fromSlide(i);
  setTimeout(() => {
    proj.hidden = true;
    els[i].classList.remove("is-away");
    pimg.style.transition = "none";
    pimg.style.transform = "";
    document.documentElement.style.overflow = "";
    if (window.siteLenis) window.siteLenis.start();
    cur = -1;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }, reduceMotion ? 0 : 680);
}

// カルーセル映写機のように、一瞬暗転してから次のコマへ
let switching = false;
function step(delta) {
  if (cur === -1 || switching) return;
  switching = true;
  const n = (cur + delta + N) % N;
  shutter.className = "proj-shutter is-closed";
  setTimeout(async () => {
    els[cur].classList.remove("is-away");
    cur = n;
    els[n].classList.add("is-away");
    pimg.src = FILMS[n].thumb;
    caption(n);
    try { await pimg.decode(); } catch (e) {}
    shutter.className = "proj-shutter is-opening";
    loadHi(n);
    switching = false;
  }, 160);
}

$("#proj-close").addEventListener("click", closeProjector);
$("#proj-prev").addEventListener("click", e => { e.stopPropagation(); step(-1); showControls(); });
$("#proj-next").addEventListener("click", e => { e.stopPropagation(); step(1); showControls(); });
// 写真とボタン以外の空いている所を押したら閉じる（PC・スマホ共通）
proj.addEventListener("click", e => {
  if (!e.target.closest("#proj-img, .p-btn")) closeProjector();
});

document.addEventListener("keydown", e => {
  if (cur !== -1) {
    if (e.key === "Escape") closeProjector();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Tab") {
      // フォーカスを映写画面の中に閉じ込める
      const f = [...proj.querySelectorAll("button")];
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  } else if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey && !/input|textarea/i.test(e.target.tagName)) {
    setLoupe(!loupeOn);
  }
});

// スマホ: スワイプで前後、タップで操作ボタンを再表示（ボタンは一定時間で隠れる）
const isMobileView = () => window.matchMedia("(max-width: 780px)").matches;
let hideTimer = null;
function showControls() {
  proj.classList.remove("hide-controls");
  clearTimeout(hideTimer);
  if (isMobileView()) hideTimer = setTimeout(() => proj.classList.add("hide-controls"), 2500);
}
let tx = 0, ty = 0;
proj.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
proj.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { step(dx < 0 ? 1 : -1); showControls(); }
  else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !e.target.closest(".p-btn")) showControls();
});

// テーブルが見えたら、スライドを一枚ずつ置いていく
layout();
const placeIO = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting) return;
  placeIO.disconnect();
  slidesEl.classList.remove("pre");
  setTimeout(() => slidesEl.classList.add("placed"), N * 28 + 1000);
  setTimeout(parkLens, N * 28 + 700);
}, { threshold: 0.15 });
placeIO.observe(surface);
