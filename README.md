# oriz-img

**Live: https://img.oriz.in**

A darkroom for your images. Resize, crop, compress, convert (PNG / JPEG / WebP) and strip EXIF metadata — all in your browser.

**100% client-side. No upload, no signup, no server.** Every pixel is processed in this tab via native `<canvas>` + `createImageBitmap`; nothing is sent anywhere.

## Features

- **Resize** — fit inside a max box (aspect-preserving) or scale by percent; optional upscaling.
- **Crop** — drag a region on a live preview; exports source-resolution pixels.
- **Compress** — target a file size (web-worker `browser-image-compression`, lazy-loaded on use).
- **Convert** — PNG · JPEG · WebP with a quality slider (JPEG/WebP).
- **Strip EXIF** — re-encodes through canvas, dropping all EXIF/GPS/camera metadata.
- **AI caption** — optional alt-text via `@chirag127/oz-ai` vision (g4f multi-provider failover; degrades gracefully if offline).
- **Background removal** — opt-in, lazy `@imgly/background-removal` (~40 MB model warned before load; never on initial paint).
- **Before/after slider** — signature wipe comparison of original vs. result.

## Privacy

No image ever leaves your browser. There is no backend and no telemetry. Works offline after first load.

## Stack

Static Astro + React 19 islands + Tailwind v4. Shared atomic `@chirag127/oz-*` packages for AI, file helpers, chrome, and design tokens. Heavy libs (compression, background removal) are dynamically imported only when triggered — first paint stays instant.

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
