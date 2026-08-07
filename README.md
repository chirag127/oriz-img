# oriz-img

**Live app:** https://img.oriz.in
**About / info:** https://chirag127.github.io/oriz-img/
**llms.txt:** https://img.oriz.in/llms.txt

Darkroom for your images. Resize, crop, compress, convert (PNG / JPEG / WebP) and strip EXIF metadata — plus AI alt-text — all in your browser.

**100% client-side, no upload, no signup, free.** Every pixel is processed in this tab via native `<canvas>` + `createImageBitmap`; nothing is sent anywhere.

## Features

- **Resize** — fit inside a max box (aspect-preserving) or scale by percent; optional upscaling.
- **Crop** — drag a region on a live preview; exports source-resolution pixels.
- **Compress** — target a file size (web-worker `browser-image-compression`, lazy-loaded on use).
- **Convert** — PNG · JPEG · WebP with a quality slider (JPEG/WebP).
- **Strip EXIF** — re-encodes through canvas, dropping all EXIF/GPS/camera metadata.
- **AI alt-text** — optional caption via `@chirag127/oz-ai` (g4f multi-provider failover; degrades gracefully offline).
- **Background removal** — opt-in, lazy `@imgly/background-removal` (~40 MB model warned before load).
- **Before/after slider** — signature wipe comparison of original vs. result.

## Privacy

No image ever leaves your browser. No backend, no telemetry. Works offline after first load. PWA-installable.

## Tech

Static Astro + React 19 islands + Tailwind v4. Shared atomic `@chirag127/oz-*` packages for AI, file helpers, chrome and design tokens. Heavy libs (compression, background removal) dynamically imported only when triggered — first paint stays instant. Hosted on Cloudflare Pages; info page on GitHub Pages.

## Develop

```bash
npm install --legacy-peer-deps
npm run dev       # local
npm run build     # static dist/
npm test          # vitest (pure image math)
npm run deploy    # build + wrangler pages deploy
```

## License

MIT © 2026 Chirag Singhal
