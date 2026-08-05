# SVG CSS VJ Site

SVGとCSS animationで、毎日ループするVJ素材を公開する静的サイトです。

This is a frame for the SVG/CSS pipeline: daily data, preview, export controls, purchase-link slot, and GitHub Pages publishing are in place.

## Run

```sh
python3 -m http.server 4214
```

Open `http://localhost:4214/`.

## Daily Publish

```sh
npm run daily:publish
```

日付指定:

```sh
npm run daily:update -- --date=2026-08-09
npm run publish:pages
```
