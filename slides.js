// スライドマウントのHTMLを組み立てる（トップページとライトボックスで共用）

const pad2 = n => String(n).padStart(2, "0");

// 番号から決まる疑似乱数（毎回同じ見た目になるように）
function seeded(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function mountHTML(f, { src = f.thumb, hand = true } = {}) {
  const dustX = `${-Math.round(seeded(f.id) * 110)}cqw`;
  const dustY = `${-Math.round(seeded(f.id + 7) * 70)}cqw`;
  const handR = `${(seeded(f.id + 3) * 6 - 4).toFixed(1)}deg`;
  const note = f.title || "Iceland ’26";
  return `
    <div class="mount${f.portrait ? " portrait" : ""}" style="--dust-x:${dustX};--dust-y:${dustY};--hand-r:${handR}">
      <div class="mount-face">
        <span class="mount-print brand">${FILM_STOCK}</span>
        <div class="mount-bevel"></div>
        <div class="mount-window"><img src="${src}" alt="" draggable="false" decoding="async" /></div>
        ${hand ? `<span class="mount-hand">${note}</span>` : ""}
        <span class="mount-print no">${pad2(f.id)}</span>
      </div>
    </div>`;
}
