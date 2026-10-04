// トップページ。数字・日付・地名はすべて data.js / routes.js / film.js から算出する（手書きの数字を持たない）

const NS = "http://www.w3.org/2000/svg";
const DATES = Object.keys(ROUTES_BY_DATE).sort();
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayOf = d => new Date(`${d}T12:00:00Z`);
const ddmm = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const fmt = n => Math.round(n).toLocaleString("en-US");
const fileId = p => p.file.replace(/^images\/|\.jpg$/g, "");
const photoByFile = id => PHOTOS.find(p => fileId(p) === id);

// 各日の走行距離（GPS軌跡の点を順に結んだ大円距離の合計）
function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const KM = DATES.map(d => ROUTES_BY_DATE[d].reduce((s, p, i, arr) => (i ? s + haversine(arr[i - 1], p) : 0), 0));
const TOTAL_KM = KM.reduce((a, b) => a + b, 0);

// 各日の代表写真（7/18 は写真がないのでフィルムの最後のコマ）
const CHAPTER_PHOTOS = {
  "2026-07-10": "0L7A1175",
  "2026-07-11": "0L7A1270",
  "2026-07-12": "0L7A1508",
  "2026-07-13": "0L7A1899",
  "2026-07-14": "0L7A2238",
  "2026-07-15": "0L7A2431",
  "2026-07-16": "0L7A2693",
  "2026-07-17": "0L7A2745"
};

// ---------- 文字の差し込み ----------
const first = DATES[0], last = DATES[DATES.length - 1];
document.getElementById("m-dates").textContent = `${first.slice(8, 10)} — ${ddmm(last)}.${last.slice(0, 4)}`;
document.getElementById("m-km").textContent = `${fmt(TOTAL_KM)} km`;
document.getElementById("m-frames").textContent = `${PHOTOS.length} digital + ${FILMS.length} film`;

// 数字を英単語に（例: 100 → One hundred, 35 → thirty-five）
function words(n) {
  const a = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const t = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (n < 20) return a[n];
  if (n < 100) return t[Math.floor(n / 10)] + (n % 10 ? `-${a[n % 10]}` : "");
  if (n < 1000) return `${a[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ""}`;
  return n.toLocaleString("en-US");
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
document.querySelector(".days-num").textContent = cap(words(DATES.length));
document.querySelector(".digital-num").textContent = cap(words(PHOTOS.length));
document.querySelector(".film-num").textContent = words(FILMS.length);
document.getElementById("enter-map-meta").textContent = `${PHOTOS.length} frames · ${DATES.length} days · ${fmt(TOTAL_KM)} km`;
document.getElementById("enter-lb-meta").textContent = `${FILMS.length} frames · FUJIFILM ${FILM_STOCK}`;
document.getElementById("f-gear").innerHTML = `${PHOTOS[0].camera}<br>FUJIFILM ${FILM_STOCK}`;

// ---------- イントロ → ヒーロー ----------
(function intro() {
  const html = document.documentElement;
  const heroImg = document.querySelector(".hero-media img");
  const ready = () => document.body.classList.add("is-ready");
  const imgReady = heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  if (!html.classList.contains("has-intro") || reduceMotion) {
    html.classList.remove("has-intro");
    Promise.race([Promise.all([imgReady, fontsReady]), new Promise(r => setTimeout(r, 1200))]).then(ready);
    return;
  }
  if (window.siteLenis) window.siteLenis.stop();
  const intro = document.getElementById("intro");
  const count = document.getElementById("intro-count");
  const bar = document.getElementById("intro-bar");
  let shown = 0, target = 0, done = false;
  const start = performance.now();
  Promise.all([imgReady, fontsReady]).then(() => { done = true; });
  setTimeout(() => { done = true; }, 4500); // 回線が遅くても長く待たせない
  const step = now => {
    const t = (now - start) / 1000;
    target = done ? 100 : Math.min(90, t * 60);
    shown += (target - shown) * 0.12;
    const v = Math.min(100, Math.round(shown));
    count.textContent = String(v).padStart(3, "0");
    bar.style.transform = `scaleX(${v / 100})`;
    if (v >= 100 && t > 1.5) {
      intro.classList.add("is-done");
      try { sessionStorage.setItem("introSeen", "1"); } catch (e) {}
      setTimeout(ready, 250);
      setTimeout(() => { html.classList.remove("has-intro"); if (window.siteLenis) window.siteLenis.start(); }, 1200);
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();

// ---------- ヒーローの動画と音声 ----------
(function heroFilm() {
  const video = document.getElementById("hero-video");
  const btn = document.getElementById("sound-toggle");
  const label = btn.querySelector(".sound-label");
  const heroEl = document.querySelector(".hero");
  const saveData = navigator.connection && navigator.connection.saveData;
  // 動きを減らす設定・データセーバーのときは動画を読み込まず、静止画のまま
  if (reduceMotion || saveData) return;

  // 縦長の画面（スマホを縦に持った状態など）には、中央を縦に切り出した専用の動画と静止画を使う
  if (window.matchMedia("(max-aspect-ratio: 1/1)").matches) {
    video.innerHTML = `
      <source src="video/iceland-m-hevc.mp4" type='video/mp4; codecs="hvc1"' />
      <source src="video/iceland-m-h264.mp4" type="video/mp4" />`;
    const poster = document.querySelector(".hero-poster");
    poster.removeAttribute("srcset");
    poster.src = "video/iceland-m-poster.jpg";
  }
  video.preload = "auto";
  video.muted = true;
  video.load();
  // 音付きの再生がブラウザに止められたら、消音にして映像だけ再開する
  const start = () => video.play().catch(() => {
    if (!video.muted) {
      setSound(false, true);
      video.play().catch(() => {});
    }
  });
  video.addEventListener("playing", () => document.body.classList.add("film-on"), { once: true });
  video.addEventListener("loadedmetadata", () => {
    const d = Math.round(video.duration);
    if (d) document.getElementById("m-cover").textContent = `ICELAND · ${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
  });
  start();
  btn.hidden = false;

  // 音量をなめらかに上げ下げする（iOS は音量を変えられないので即時に切り替わる）
  let fadeRaf = 0;
  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeRaf);
    const from = video.volume, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      video.volume = from + (target - from) * k;
      if (k < 1) fadeRaf = requestAnimationFrame(step);
      else if (done) done();
    };
    fadeRaf = requestAnimationFrame(step);
  }
  let soundOn = false;
  function setSound(on, instant) {
    soundOn = on;
    btn.setAttribute("aria-pressed", String(on));
    label.textContent = on ? "Sound on" : "Sound off";
    btn.classList.toggle("is-on", on);
    if (on) {
      video.muted = false;
      video.volume = 0;
      if (video.paused) start();
      fadeTo(1, 700);
    } else if (instant) {
      cancelAnimationFrame(fadeRaf);
      video.muted = true;
    } else {
      fadeTo(0, 400, () => { if (!soundOn) video.muted = true; });
    }
  }
  btn.addEventListener("click", () => setSound(!soundOn));

  // ヒーローが画面から外れたら一時停止（音も止まる）。戻ったら再開
  let heroVisible = true;
  new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible && !document.hidden) start();
    else video.pause();
  }, { threshold: 0 }).observe(heroEl);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (heroVisible) start();
  });
  // ヒーローから離れるほど音を小さくする
  window.addEventListener("scroll", () => {
    if (!soundOn || video.muted) return;
    const k = Math.max(0, 1 - window.scrollY / (heroEl.offsetHeight * 0.9));
    cancelAnimationFrame(fadeRaf);
    video.volume = k;
  }, { passive: true });
})();

// ---------- ヒーローの視差 ----------
(function parallax() {
  if (reduceMotion) return;
  const media = document.querySelector(".hero-media");
  const inner = document.querySelector(".hero-inner");
  const heroEl = document.querySelector(".hero");
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const h = heroEl.offsetHeight;
    if (y > h) return;
    media.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
    inner.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
    inner.style.opacity = String(Math.max(0, 1 - y / (h * 0.7)));
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
})();

// ---------- 数字のカウントアップ ----------
(function counters() {
  const values = { days: DATES.length, km: TOTAL_KM, digital: PHOTOS.length, film: FILMS.length };
  const stats = document.querySelector(".stats");
  const els = stats.querySelectorAll("[data-count]");
  if (reduceMotion) { els.forEach(el => { el.textContent = fmt(values[el.dataset.count]); }); return; }
  const io = new IntersectionObserver(entries => {
    const en = entries[0];
    // すでに通り過ぎている（再読み込みでスクロール位置が戻った等）ときは、最終値をそのまま出す
    if (!en.isIntersecting && en.boundingClientRect.bottom < 0) {
      io.disconnect();
      els.forEach(el => { el.textContent = fmt(values[el.dataset.count]); });
      return;
    }
    if (!en.isIntersecting) return;
    io.disconnect();
    const t0 = performance.now(), dur = 1800;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(2, -10 * k); // easeOutExpo
      els.forEach(el => { el.textContent = fmt(values[el.dataset.count] * (k === 1 ? 1 : e)); });
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.4 });
  io.observe(stats);
})();

// ---------- 地図の投影（高緯度なので経度方向を cos(65°) で縮める） ----------
function makeProjection(width) {
  const kx = Math.cos(65 * Math.PI / 180);
  const all = DATES.flatMap(d => ROUTES_BY_DATE[d]);
  const lats = all.map(p => p[0]), lngs = all.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const S = width / ((maxLng - minLng) * kx);
  return {
    x: lng => (lng - minLng) * kx * S,
    y: lat => (maxLat - lat) * S,
    h: (maxLat - minLat) * S
  };
}
const pathD = (pts, P) => "M" + pts.map(p => `${P.x(p[1]).toFixed(1)},${P.y(p[0]).toFixed(1)}`).join("L");
function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

// ---------- 旅程: 章とルートの描画 ----------
(function journey() {
  const svg = document.getElementById("journey-svg");
  const P = makeProjection(1000);
  const pad = 40;
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${1000 + pad * 2} ${(P.h + pad * 2).toFixed(1)}`);

  DATES.forEach(d => el("path", { d: pathD(ROUTES_BY_DATE[d], P), class: "ghost" }, svg));

  // 主要な町（座標は実際の町の位置）
  [["Reykjavík", 64.1466, -21.9426, "end"], ["Akureyri", 65.6885, -18.1262, "middle"], ["Höfn", 64.2539, -15.2082, "start"], ["Vík", 63.4186, -19.006, "middle"]]
    .forEach(([name, lat, lng, anchor]) => {
      const t = el("text", { x: P.x(lng) + (anchor === "end" ? -14 : anchor === "start" ? 14 : 0), y: P.y(lat) + (name === "Akureyri" ? -18 : name === "Vík" ? 34 : 6), "text-anchor": anchor, class: "city" }, svg);
      t.textContent = name;
    });

  const paths = DATES.map(d => {
    const p = el("path", { d: pathD(ROUTES_BY_DATE[d], P), class: "day" }, svg);
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = len;
    return { p, len };
  });
  const dots = PHOTOS.map(ph => ({ d: ph.date.slice(0, 10), c: el("circle", { cx: P.x(ph.lng), cy: P.y(ph.lat), r: 3.2, class: "pdot" }, svg) }));
  const here = el("circle", { r: 12, class: "here" }, svg);
  const head = el("circle", { r: 5.5, class: "head" }, svg);

  // 章（日ごと）
  const list = document.getElementById("chapters");
  const chapters = DATES.map((d, i) => {
    const photos = PHOTOS.filter(p => p.date.startsWith(d));
    const places = [...new Set(photos.map(p => p.title))];
    const label = (DATE_LABELS[d] || "").replace(/^\S+\s*/, "");
    const id = CHAPTER_PHOTOS[d];
    const ph = id && photoByFile(id);
    const li = document.createElement("li");
    li.className = "chapter" + (ph ? "" : " chapter--end");
    const wd = WEEK[dayOf(d).getUTCDay()];
    const media = ph
      ? `<figure class="ch-media"><img src="images/site/${id}.jpg" alt="${ph.title}" loading="lazy" decoding="async" /><figcaption class="mono">${ph.title} · ${ph.date.slice(11)}</figcaption></figure><p class="ch-exif mono">${ph.exif}<span>${ph.lens}</span></p>`
      : `<figure class="ch-media"><img src="${FILMS[FILMS.length - 1].file}" alt="The last frame on the roll of film" loading="lazy" decoding="async" /><figcaption class="mono">Film № ${pad2(FILMS.length)}</figcaption></figure>`;
    li.id = `day-${i + 1}`;
    li.innerHTML = `
      <div class="ch-text" data-reveal>
        <p class="ch-day mono"><b>Day ${pad2(i + 1)}</b> — ${wd} ${ddmm(d)}</p>
        <h3 class="ch-title">${label}</h3>
        ${places.length ? `<ul class="ch-places">${places.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
        <p class="ch-stats mono"><span><b>${fmt(KM[i])}</b> km</span>${photos.length ? `<span><b>${photos.length}</b> frames</span>` : ""}</p>
      </div>
      ${media}`;
    list.appendChild(li);
    return { li, d, label, ph, media: li.querySelector(".ch-media") };
  });
  chapters.forEach(c => revealObserver.observe(c.media));
  observeReveals(list);

  // 日付のインデックス（押すとその日の章へ移動）
  const index = document.getElementById("jm-index");
  const indexItems = DATES.map((d, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" aria-label="Jump to day ${i + 1} (${ddmm(d)})">${pad2(i + 1)}</button>`;
    li.querySelector("button").addEventListener("click", () => {
      const target = chapters[i].li;
      const y = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
      if (window.siteLenis) window.siteLenis.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    });
    index.appendChild(li);
    return li;
  });

  const jmDay = document.getElementById("jm-day");
  const jmDate = document.getElementById("jm-date");
  const jmKm = document.getElementById("jm-km");
  const jmLabel = document.getElementById("jm-label");
  let lastActive = -1;

  function update() {
    const anchor = window.innerHeight * 0.5;
    let active = 0, prog = 0;
    chapters.forEach((c, i) => {
      const r = c.li.getBoundingClientRect();
      if (r.top < anchor) { active = i; prog = Math.min(1, Math.max(0, (anchor - r.top) / r.height)); }
    });
    // 最初の章より上にいる間は何も描かない
    const r0 = chapters[0].li.getBoundingClientRect();
    if (r0.top >= anchor) prog = 0;

    paths.forEach((o, i) => {
      const k = i < active ? 1 : i === active ? prog : 0;
      o.p.style.strokeDashoffset = o.len * (1 - k);
      o.p.classList.toggle("is-active", i === active);
    });
    const a = paths[active];
    const pt = a.p.getPointAtLength(a.len * prog);
    head.setAttribute("cx", pt.x);
    head.setAttribute("cy", pt.y);
    head.style.opacity = prog > 0 ? 1 : 0;

    if (active !== lastActive) {
      lastActive = active;
      const c = chapters[active];
      jmDay.textContent = `Day ${pad2(active + 1)} / ${pad2(DATES.length)}`;
      jmDate.textContent = `${WEEK[dayOf(c.d).getUTCDay()]} ${ddmm(c.d)}`;
      jmLabel.textContent = c.label;
      indexItems.forEach((li, i) => { li.className = i < active ? "past" : i === active ? "now" : ""; });
      dots.forEach(o => o.c.classList.toggle("on", o.d <= c.d));
      if (c.ph) {
        here.setAttribute("cx", P.x(c.ph.lng));
        here.setAttribute("cy", P.y(c.ph.lat));
        here.classList.add("on");
      } else here.classList.remove("on");
    }
    const kmSoFar = KM.slice(0, active).reduce((s, v) => s + v, 0) + KM[active] * prog;
    jmKm.textContent = fmt(kmSoFar);
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// ---------- フィルムストリップ ----------
(function strip() {
  const track = document.getElementById("strip-track");
  const film = () => {
    const f = document.createElement("div");
    f.className = "film";
    f.innerHTML = FILMS.map((x, i) => `
      <div class="frame${x.portrait ? " portrait" : ""}">
        <div class="pic"><img src="${x.thumb}" alt="" loading="lazy" decoding="async" draggable="false" /></div>
        ${i % 2 === 0 ? `<span class="edge edge-top">${FILM_STOCK}</span>` : ""}
        <span class="edge edge-no">${x.id}</span>
        <span class="edge edge-mid">▸${x.id}A</span>
      </div>`).join("");
    return f;
  };
  track.appendChild(film());
  const dup = film();
  dup.setAttribute("aria-hidden", "true");
  track.appendChild(dup);
})();

// ---------- 一番上へ ----------
document.getElementById("to-top").addEventListener("click", e => {
  e.preventDefault();
  if (window.siteLenis) window.siteLenis.scrollTo(0, { duration: 2 });
  else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});
