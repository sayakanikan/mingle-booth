# Mingle Booth — Agent Guide

Mingle Booth is an interactive photobooth web application for live events featuring photo capture, frame overlays, animated GIF generation, cloud upload, and QR code access for guests.

## Architecture & Surfaces
- **Booth Kiosk (`/`)**: Fullscreen client app for guests (Screensaver -> Capture -> Processing -> Result with QR code).
- **Admin Dashboard (`/admin/*`)**: Configuration for camera, branding, frames/slot editor, gallery, and security. Protected by signed cookie session and `proxy.ts`.
- **Guest Viewer (`/s/[id]`)**: Responsive mobile-first page for guests scanning the QR code to view and download their photo strip, GIF, and originals. Also maintains backward compatibility with legacy `/?view=latest&...` query params.

## Tech Stack
- **Framework**: Next.js (App Router), React 19, TypeScript
- **ORM**: Prisma ORM with `@prisma/adapter-pg` connecting to Supabase PostgreSQL server-side
- **Styling**: Tailwind CSS v4 (`@theme` design tokens in `app/globals.css`, no `tailwind.config.js`)
- **Media**: Cloudinary unsigned upload direct from client (avoids Next.js server payload limits)
- **Kiosk Hardware**: WebRTC MediaDevices API, HTML5 Canvas, Web Audio API, GIF.js, QRCode

## Hard Directives
1. **Database Access**: All DB operations MUST run on the server through `@/lib/db` via Server Actions or Server Components. Never expose database credentials or direct DB calls to the browser.
2. **Admin Security**: Every admin Server Action must call `await requireAdmin()`. Password hash (`adminPasswordHash`) must never be returned to client components.
3. **Kiosk Performance**: Keep client bundle clean. Browser APIs (`navigator.mediaDevices`, `AudioContext`, canvas, `gif.js`) must be executed only in client components (`'use client'`) inside event handlers or `useEffect`.
4. **CORS & Canvas**: Always set `crossOrigin = 'anonymous'` on any remote image before drawing to an `HTMLCanvasElement` to avoid tainted canvas errors.
5. **Simplicity First**: Follow anti-overengineering. No unnecessary abstractions, no extra third-party wrappers, standard library first.

## Scripts
- `npm run dev` - Start development server (exposed on LAN for phone testing)
- `npm run build` - Generate Prisma client and build Next.js production bundle
- `npm run start` - Start production server on port 3000
- `npm run typecheck` - Run TypeScript compiler check

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
