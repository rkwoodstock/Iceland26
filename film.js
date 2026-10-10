// フィルム写真（Nikon New FM2 で撮影、FUJIFILM PROVIA 100F・35mm リバーサル）のスキャンデータ。
// portrait: true は縦位置のコマ（スキャン時に横向きだったものを回転済み）。
// title に地名などを書くと、拡大表示のキャプションに表示されます（空欄なら非表示）。
const FILM_STOCK = "PROVIA 100F";
const FILM_CAMERA = "Nikon New FM2";
const FILMS = [
  { id: 1, file: "images/film/01.jpg", thumb: "images/film/thumbs/01.jpg", portrait: true, title: "" },
  { id: 2, file: "images/film/02.jpg", thumb: "images/film/thumbs/02.jpg", portrait: false, title: "" },
  { id: 3, file: "images/film/03.jpg", thumb: "images/film/thumbs/03.jpg", portrait: false, title: "" },
  { id: 4, file: "images/film/04.jpg", thumb: "images/film/thumbs/04.jpg", portrait: true, title: "" },
  { id: 5, file: "images/film/05.jpg", thumb: "images/film/thumbs/05.jpg", portrait: false, title: "" },
  { id: 6, file: "images/film/06.jpg", thumb: "images/film/thumbs/06.jpg", portrait: true, title: "" },
  { id: 7, file: "images/film/07.jpg", thumb: "images/film/thumbs/07.jpg", portrait: false, title: "" },
  { id: 8, file: "images/film/08.jpg", thumb: "images/film/thumbs/08.jpg", portrait: false, title: "" },
  { id: 9, file: "images/film/09.jpg", thumb: "images/film/thumbs/09.jpg", portrait: false, title: "" },
  { id: 10, file: "images/film/10.jpg", thumb: "images/film/thumbs/10.jpg", portrait: false, title: "" },
  { id: 11, file: "images/film/11.jpg", thumb: "images/film/thumbs/11.jpg", portrait: false, title: "" },
  { id: 12, file: "images/film/12.jpg", thumb: "images/film/thumbs/12.jpg", portrait: true, title: "" },
  { id: 13, file: "images/film/13.jpg", thumb: "images/film/thumbs/13.jpg", portrait: false, title: "" },
  { id: 14, file: "images/film/14.jpg", thumb: "images/film/thumbs/14.jpg", portrait: false, title: "" },
  { id: 15, file: "images/film/15.jpg", thumb: "images/film/thumbs/15.jpg", portrait: false, title: "" },
  { id: 16, file: "images/film/16.jpg", thumb: "images/film/thumbs/16.jpg", portrait: false, title: "" },
  { id: 17, file: "images/film/17.jpg", thumb: "images/film/thumbs/17.jpg", portrait: true, title: "" },
  { id: 18, file: "images/film/18.jpg", thumb: "images/film/thumbs/18.jpg", portrait: true, title: "" },
  { id: 19, file: "images/film/19.jpg", thumb: "images/film/thumbs/19.jpg", portrait: false, title: "" },
  { id: 20, file: "images/film/20.jpg", thumb: "images/film/thumbs/20.jpg", portrait: false, title: "" },
  { id: 21, file: "images/film/21.jpg", thumb: "images/film/thumbs/21.jpg", portrait: false, title: "" },
  { id: 22, file: "images/film/22.jpg", thumb: "images/film/thumbs/22.jpg", portrait: false, title: "" },
  { id: 23, file: "images/film/23.jpg", thumb: "images/film/thumbs/23.jpg", portrait: false, title: "" },
  { id: 24, file: "images/film/24.jpg", thumb: "images/film/thumbs/24.jpg", portrait: false, title: "" },
  { id: 25, file: "images/film/25.jpg", thumb: "images/film/thumbs/25.jpg", portrait: true, title: "" },
  { id: 26, file: "images/film/26.jpg", thumb: "images/film/thumbs/26.jpg", portrait: false, title: "" },
  { id: 27, file: "images/film/27.jpg", thumb: "images/film/thumbs/27.jpg", portrait: false, title: "" },
  { id: 28, file: "images/film/28.jpg", thumb: "images/film/thumbs/28.jpg", portrait: false, title: "" },
  { id: 29, file: "images/film/29.jpg", thumb: "images/film/thumbs/29.jpg", portrait: false, title: "" },
  { id: 30, file: "images/film/30.jpg", thumb: "images/film/thumbs/30.jpg", portrait: false, title: "" },
  { id: 31, file: "images/film/31.jpg", thumb: "images/film/thumbs/31.jpg", portrait: false, title: "" },
  { id: 32, file: "images/film/32.jpg", thumb: "images/film/thumbs/32.jpg", portrait: false, title: "" },
  { id: 33, file: "images/film/33.jpg", thumb: "images/film/thumbs/33.jpg", portrait: false, title: "" },
  { id: 34, file: "images/film/34.jpg", thumb: "images/film/thumbs/34.jpg", portrait: false, title: "" },
  { id: 35, file: "images/film/35.jpg", thumb: "images/film/thumbs/35.jpg", portrait: false, title: "" }
];
