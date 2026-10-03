// 全ページ共通: レイキャビク時計 / ヘッダー / ページ遷移 / スクロール表示 / 慣性スクロール

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- レイキャビクの現在時刻（アイスランドは通年 UTC） ----------
(function clock() {
  const el = document.getElementById("clock");
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    el.dateTime = d.toISOString();
  };
  tick();
  setInterval(tick, 10000);
})();

// ---------- ページ遷移（幕を下ろしてから移動） ----------
const curtain = document.createElement("div");
curtain.className = "curtain";
curtain.setAttribute("aria-hidden", "true");
document.body.appendChild(curtain);

document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target === "_blank" || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash) return;
  if (reduceMotion) return;
  e.preventDefault();
  document.documentElement.classList.add("is-leaving");
  setTimeout(() => { location.href = url.href; }, 560);
});
// 戻るボタンでキャッシュから復帰したとき幕を上げる
window.addEventListener("pageshow", e => {
  if (e.persisted) document.documentElement.classList.remove("is-leaving");
});

// ---------- 粒子 ----------
if (!document.body.classList.contains("page-map")) {
  const g = document.createElement("div");
  g.className = "grain";
  g.setAttribute("aria-hidden", "true");
  document.body.appendChild(g);
}

// ---------- 慣性スクロール ----------
let lenis = null;
if (window.Lenis && !reduceMotion && !document.body.classList.contains("page-map")) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
window.siteLenis = lenis;

// ---------- ヘッダー: スクロールで背景を付け、下方向では隠す ----------
(function header() {
  const h = document.querySelector(".site-header");
  if (!h || document.body.classList.contains("page-map")) return;
  let lastY = window.scrollY;
  const threshold = () => (document.body.dataset.solidAfter ? Number(document.body.dataset.solidAfter) : 40);
  const update = () => {
    const y = window.scrollY;
    h.classList.toggle("is-solid", y > threshold());
    if (Math.abs(y - lastY) > 6) {
      h.classList.toggle("is-hidden", y > lastY && y > 400);
      lastY = y;
    }
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
})();

// ---------- スクロールで現れる要素 ----------
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    // 画面に入った、またはすでに上へ通り過ぎている要素は表示状態にする
    if (en.isIntersecting || en.boundingClientRect.bottom < 0) {
      en.target.classList.add("is-in");
      revealObserver.unobserve(en.target);
    }
  });
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
function observeReveals(root = document) {
  root.querySelectorAll("[data-reveal], [data-reveal-group]").forEach(el => revealObserver.observe(el));
}
observeReveals();
window.observeReveals = observeReveals;

// ---------- カーソルに付くラベル（data-cursor を持つ要素の上だけ） ----------
(function cursorLabel() {
  if (!finePointer || reduceMotion) return;
  const targets = document.querySelectorAll("[data-cursor]");
  if (!targets.length) return;
  const el = document.createElement("div");
  el.className = "cursor-label mono";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  let x = -200, y = -200, tx = x, ty = y;
  window.addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  const loop = () => {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    requestAnimationFrame(loop);
  };
  loop();
  targets.forEach(t => {
    t.addEventListener("mouseenter", () => { el.textContent = t.dataset.cursor; el.classList.add("is-on"); });
    t.addEventListener("mouseleave", () => el.classList.remove("is-on"));
  });
})();
