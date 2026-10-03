// Photo Map: 地図・写真ピン（クラスタリング）・日付フィルター・一覧・写真ビューア

const ICELAND_BOUNDS = L.latLngBounds([62.9, -25.6], [67.0, -12.8]);
const DATES = Object.keys(ROUTES_BY_DATE).sort();
const ordered = [...PHOTOS].sort((a, b) => new Date(a.date) - new Date(b.date));
const pad3 = n => String(n).padStart(3, "0");
const pad2 = n => String(n).padStart(2, "0");
const ddmm = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const dayIndex = d => DATES.indexOf(d.slice(0, 10));
const labelOf = d => (DATE_LABELS[d] || "").replace(/^\S+\s*/, "");
const numberOf = new Map(ordered.map((p, i) => [p.id, i + 1]));

// ---------- 地図 ----------
const map = L.map("map", {
  zoomControl: false,
  minZoom: window.matchMedia("(max-width: 900px)").matches ? 5 : 6, // スマホでは島全体が入るように
  maxZoom: 17,
  maxBounds: ICELAND_BOUNDS.pad(0.15),
  maxBoundsViscosity: 1.0,
  attributionControl: true
}).setView([64.9, -18.5], 6);
L.control.zoom({ position: "bottomright" }).addTo(map);

// CARTO Voyager（明るく読みやすい地図。色味は style.css で落ち着いたトーンに調整。APIキーは config.js の CARTO_KEY）
const keyParam = typeof CARTO_KEY === "string" && CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : "";
L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${keyParam}`, {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
  noWrap: true,
  bounds: ICELAND_BOUNDS.pad(0.3)
}).addTo(map);

// ---------- ルート（日付ごとの色） ----------
const routeLayers = {};
const routeBounds = [];
DATES.forEach(d => {
  const latlngs = ROUTES_BY_DATE[d];
  routeLayers[d] = L.polyline(latlngs, {
    color: DATE_COLORS[d] || "#bcd9e6",
    weight: 3,
    opacity: 0.9,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map).bindTooltip(`<b>Day ${pad2(dayIndex(d) + 1)}</b> <span>${labelOf(d)}</span>`, { sticky: true, className: "mp-tip", direction: "top", offset: [0, -8] });
  latlngs.forEach(ll => routeBounds.push(ll));
});

// ---------- 日付フィルター ----------
let activeDay = null; // null = 全日程
const visible = () => (activeDay ? ordered.filter(p => p.date.startsWith(activeDay)) : ordered);

const daysEl = document.getElementById("mp-days");
const dayButtons = [null, ...DATES].map((d, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = d ? pad2(i) : "All";
  b.setAttribute("aria-label", d ? `Day ${i}: ${labelOf(d)}` : "All days");
  b.setAttribute("aria-pressed", String(d === activeDay));
  if (d) b.style.setProperty("--c", DATE_COLORS[d]);
  b.title = d ? `Day ${pad2(i)} — ${labelOf(d)}` : "All days";
  b.addEventListener("click", () => setDay(d === activeDay ? null : d));
  daysEl.appendChild(b);
  return { b, d };
});

const dayLabel = document.getElementById("mp-daylabel");
function setDay(d) {
  activeDay = d;
  dayButtons.forEach(o => o.b.setAttribute("aria-pressed", String(o.d === d)));
  DATES.forEach(x => {
    routeLayers[x].setStyle({ opacity: !d || x === d ? 0.9 : 0.12, weight: x === d ? 4 : 3 });
    if (x === d) routeLayers[x].bringToFront();
  });
  if (d) {
    dayLabel.innerHTML = `<small>Day ${pad2(dayIndex(d) + 1)} — ${ddmm(d)}</small>${labelOf(d)}`;
    dayLabel.classList.add("is-on");
    const b = L.latLngBounds(ROUTES_BY_DATE[d]);
    visible().forEach(p => b.extend([p.lat, p.lng]));
    map.flyToBounds(b, { padding: [70, 70], duration: 1.1 });
  } else {
    dayLabel.classList.remove("is-on");
    map.flyToBounds(allBounds, { padding: [50, 50], duration: 1.1 });
  }
  renderList();
  renderPhotoMarkers();
}

// ---------- 写真ピン（画面上で近いものはまとめる） ----------
const photoLayer = L.layerGroup().addTo(map);
const markerEls = {}; // id -> 単独ピンの要素（まとめられている間は存在しない）
const CLUSTER_PX = 46;

function pinIcon(p, count) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin${count ? " is-cluster" : ""}"><img src="${p.thumb}" alt="" loading="lazy" /></div>${count ? `<span class="pin-count">${count}</span>` : ""}<span class="pin-stem"></span>`,
    iconSize: [44, 50],
    iconAnchor: [22, 50]
  });
}

function renderPhotoMarkers() {
  photoLayer.clearLayers();
  Object.keys(markerEls).forEach(k => delete markerEls[k]);
  const items = visible().map(p => ({ p, pt: map.latLngToContainerPoint([p.lat, p.lng]) }));
  const used = new Array(items.length).fill(false);
  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue;
    const group = [items[i]];
    used[i] = true;
    for (let j = i + 1; j < items.length; j++) {
      if (used[j]) continue;
      if (Math.hypot(items[i].pt.x - items[j].pt.x, items[i].pt.y - items[j].pt.y) < CLUSTER_PX) {
        group.push(items[j]);
        used[j] = true;
      }
    }
    const photos = group.map(g => g.p);
    const first = photos[0];
    const lat = photos.reduce((s, p) => s + p.lat, 0) / photos.length;
    const lng = photos.reduce((s, p) => s + p.lng, 0) / photos.length;
    const m = L.marker([lat, lng], { icon: pinIcon(first, photos.length > 1 ? photos.length : 0), riseOnHover: true, keyboard: true, title: first.title });
    const names = [...new Set(photos.map(p => p.title))];
    m.bindTooltip(`<b>${names[0]}</b>${names.length > 1 ? ` <span>+${names.length - 1}</span>` : ""}<br><span>${photos.length > 1 ? `${photos.length} frames` : `№ ${pad3(numberOf.get(first.id))}`}</span>`, { className: "mp-tip", direction: "top", offset: [0, -50] });
    // ピンを押したら、そのまとまりの写真をビューアで順に見られる
    m.on("click", () => openViewer(first.id, photos));
    m.on("add", () => { if (photos.length === 1) markerEls[first.id] = m.getElement(); });
    m.addTo(photoLayer);
  }
}
map.on("moveend", renderPhotoMarkers);

// ---------- 中心座標の表示 ----------
const hudPos = document.getElementById("hud-pos");
const hudZoom = document.getElementById("hud-zoom");
function updateHud() {
  const c = map.getCenter();
  hudPos.textContent = `${Math.abs(c.lat).toFixed(3)}°${c.lat >= 0 ? "N" : "S"}  ${Math.abs(c.lng).toFixed(3)}°${c.lng >= 0 ? "E" : "W"}`;
  hudZoom.textContent = `Z${map.getZoom().toFixed(0)}`;
}
map.on("move", updateHud);

// ---------- 一覧 ----------
const listEl = document.getElementById("mp-list");
function renderList() {
  listEl.replaceChildren();
  let lastDay = "";
  visible().forEach(p => {
    const d = p.date.slice(0, 10);
    if (d !== lastDay) {
      lastDay = d;
      const sep = document.createElement("li");
      sep.className = "mp-sep mono";
      sep.style.setProperty("--c", DATE_COLORS[d]);
      sep.innerHTML = `<i></i><b>Day ${pad2(dayIndex(d) + 1)}</b> ${labelOf(d)}`;
      listEl.appendChild(sep);
    }
    const li = document.createElement("li");
    li.innerHTML = `
      <button type="button" class="mp-item" data-id="${p.id}">
        <img src="${p.thumb}" alt="" loading="lazy" />
        <span>
          <span class="t">${p.title}</span>
          <span class="d mono"><b>№ ${pad3(numberOf.get(p.id))}</b>${ddmm(d)} · ${p.date.slice(11)}</span>
        </span>
      </button>`;
    const btn = li.firstElementChild;
    btn.addEventListener("click", () => {
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 12), { animate: false });
      openViewer(p.id, visible());
    });
    btn.addEventListener("mouseenter", () => markerEls[p.id]?.classList.add("is-hot"));
    btn.addEventListener("mouseleave", () => markerEls[p.id]?.classList.remove("is-hot"));
    listEl.appendChild(li);
  });
}
function highlightItem(id) {
  listEl.querySelectorAll(".mp-item").forEach(el => {
    const on = Number(el.dataset.id) === id;
    el.classList.toggle("is-active", on);
    if (on) el.scrollIntoView({ block: "nearest" });
  });
}

// ---------- 数字 ----------
function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const totalKm = DATES.reduce((s, d) => s + ROUTES_BY_DATE[d].reduce((t, p, i, a) => (i ? t + haversine(a[i - 1], p) : 0), 0), 0);
document.getElementById("st-frames").textContent = PHOTOS.length;
document.getElementById("st-days").textContent = DATES.length;
document.getElementById("f-camera").textContent = PHOTOS[0].camera;
document.getElementById("st-km").textContent = Math.round(totalKm).toLocaleString("en-US");

// ---------- 写真ビューア ----------
const viewer = document.getElementById("viewer");
const vImg = document.getElementById("v-img");
let vList = ordered;
let vPos = 0;
let lastFocus = null;
const isMobileView = () => window.matchMedia("(max-width: 900px)").matches;

function fmtPos(p) {
  return `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? "N" : "S"} ${Math.abs(p.lng).toFixed(4)}°${p.lng >= 0 ? "E" : "W"}`;
}
function showPhoto(pos) {
  const n = vList.length;
  vPos = (pos + n) % n;
  const p = vList[vPos];
  const d = p.date.slice(0, 10);
  vImg.classList.remove("is-loaded");
  vImg.onload = () => vImg.classList.add("is-loaded");
  vImg.src = p.file;
  vImg.alt = p.title;
  if (vImg.complete && vImg.naturalWidth) vImg.classList.add("is-loaded");
  document.getElementById("v-count").innerHTML = `<b>№ ${pad3(numberOf.get(p.id))}</b> / ${pad3(PHOTOS.length)}${n > 1 && n < PHOTOS.length ? ` — ${vPos + 1} of ${n}` : ""}`;
  document.getElementById("v-title").textContent = p.title;
  document.getElementById("v-comment").textContent = p.desc || "";
  document.getElementById("v-date").textContent = `Day ${pad2(dayIndex(d) + 1)} · ${ddmm(d)}.${d.slice(0, 4)} ${p.date.slice(11)}`;
  document.getElementById("v-camera").textContent = p.camera || "—";
  document.getElementById("v-lens").textContent = p.lens || "—";
  document.getElementById("v-exif").textContent = p.exif || "—";
  document.getElementById("v-pos").textContent = fmtPos(p);
  highlightItem(p.id);
  // 前後を先読み
  [vPos - 1, vPos + 1].forEach(j => { new Image().src = vList[(j + n) % n].file; });
}
function openViewer(id, list) {
  lastFocus = document.activeElement;
  vList = list && list.length ? list : ordered;
  const i = vList.findIndex(p => p.id === id);
  viewer.hidden = false;
  document.documentElement.style.overflow = "hidden"; // 背面のページをスクロールさせない
  showPhoto(i < 0 ? 0 : i);
  requestAnimationFrame(() => viewer.classList.add("is-open"));
  document.getElementById("v-close").focus({ preventScroll: true });
  showControls();
}
function closeViewer() {
  viewer.classList.remove("is-open", "hide-controls");
  clearTimeout(controlsTimer);
  setTimeout(() => { viewer.hidden = true; document.documentElement.style.overflow = ""; }, 350);
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}

// スマホ: 操作ボタンは一定時間で隠れ、写真をタップすると再表示
let controlsTimer = null;
function showControls() {
  viewer.classList.remove("hide-controls");
  clearTimeout(controlsTimer);
  if (isMobileView()) controlsTimer = setTimeout(() => viewer.classList.add("hide-controls"), 2500);
}

document.getElementById("v-close").addEventListener("click", closeViewer);
document.getElementById("v-prev").addEventListener("click", () => { showPhoto(vPos - 1); showControls(); });
document.getElementById("v-next").addEventListener("click", () => { showPhoto(vPos + 1); showControls(); });
viewer.addEventListener("click", e => {
  if (e.target === viewer || e.target.classList.contains("v-figure")) { if (!isMobileView()) closeViewer(); }
});
vImg.addEventListener("click", showControls);
document.addEventListener("keydown", e => {
  if (viewer.hidden) return;
  if (e.key === "Escape") closeViewer();
  else if (e.key === "ArrowLeft") showPhoto(vPos - 1);
  else if (e.key === "ArrowRight") showPhoto(vPos + 1);
  else if (e.key === "Tab") {
    const f = [...viewer.querySelectorAll("button")];
    const k = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }
});
let sx = 0, sy = 0;
viewer.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
viewer.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { showPhoto(vPos + (dx < 0 ? 1 : -1)); showControls(); }
  else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !e.target.closest(".p-btn")) showControls();
}, { passive: true });

// ---------- 初期表示 ----------
// レイアウト確定前に fitBounds するとコンテナの大きさを誤認するため、少し遅らせて合わせる
const allBounds = L.latLngBounds([...ordered.map(p => [p.lat, p.lng]), ...routeBounds]);
function fitToRoute() {
  map.invalidateSize();
  map.fitBounds(allBounds, { padding: [50, 50] });
  updateHud();
}
renderList();
setTimeout(() => { fitToRoute(); renderPhotoMarkers(); }, 0);
window.addEventListener("load", fitToRoute);
