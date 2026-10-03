# Iceland Trip Photo Map

アイスランド旅行（2026年7月）の写真サイトです。

| ページ | 内容 |
| --- | --- |
| `index.html` | トップページ。旅の概要、日ごとのルートをスクロールでたどる章立て、フィルムストリップ、各ページへの入口 |
| `map.html` | フォトマップ。撮影地点のピン（近接する写真はクラスタリング）、日付ごとに色分けした移動ルート（Googleタイムラインの実データ）、日付での絞り込み |
| `lightbox.html` | ライトボックス。リバーサルフィルム（PROVIA 100F）35コマをスライドマウントでテーブルに並べ、ドラッグで移動・ルーペで拡大・クリックで映写 |

## 技術メモ

- 静的サイト（HTML / CSS / JavaScript）。ビルド不要
- 共通: `site.css` / `site.js`（ヘッダー、ページ遷移、フォント、スクロール演出）、`slides.css` / `slides.js`（スライドマウント）
- 外部: Google Fonts、[Lenis](https://github.com/darkroomengineering/lenis)（慣性スクロール）、Leaflet
- トップページの数字（日数・距離・枚数）は `data.js` / `routes.js` / `film.js` から自動計算
- 地図ライブラリ: [Leaflet](https://leafletjs.com/) / タイル: CARTO Voyager（OpenStreetMap）を彩度を落として使用。APIキーは `config.js` の `CARTO_KEY` に設定
- サイトの表記はすべて英語（地名・コメントは `data.js`、日付ごとの見出しは `routes.js` の `DATE_LABELS`）
- フィルム写真のデータは `film.js`（`title` に地名を書くと拡大表示に出ます）
- 写真の位置は、各写真の撮影時刻とGoogleタイムラインのGPS軌跡を突き合わせて自動推定

## ローカルでの表示

`file://` で直接開くと地図が正しく動かないため、簡易サーバー経由で開いてください。

```bash
python3 -m http.server 8000
```

その後ブラウザで `http://localhost:8000` を開きます。
