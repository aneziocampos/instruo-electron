---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, performance]
---

## Problem Statement

`desktopCapturer.getSources()` is called on every single mouse click. This API enumerates ALL screen sources and captures full-resolution thumbnails for each. Takes 100-300ms per call. During rapid clicking, multiple concurrent calls degrade to 500ms+. On Retina displays, each call generates a ~16MB raw NativeImage buffer.

## Findings

- `src/main/screenshot-capture.ts` lines 24-37 — Every mouse click triggers a full `desktopCapturer.getSources()` call, which:
  - Enumerates all available screen sources (windows, displays).
  - Captures full-resolution thumbnails for each source.
  - Takes 100-300ms per invocation under normal conditions.
  - During rapid clicking, concurrent calls can degrade to 500ms+ each.
  - On Retina/HiDPI displays, each call generates approximately 16MB of raw NativeImage buffer data.

## Proposed Solution

1. **Cache the source ID:** The display source ID does not change during a recording session. Call `getSources()` once at session start (or on first click) and cache the matching source ID for subsequent captures.
2. **Cap thumbnail size:** Pass `thumbnailSize` with logical pixel dimensions (divide physical pixels by `scaleFactor`) to avoid generating unnecessarily large buffers:
   ```typescript
   const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
   const { width, height } = screen.getPrimaryDisplay().size;
   desktopCapturer.getSources({
     types: ['screen'],
     thumbnailSize: { width, height } // logical pixels, not physical
   });
   ```
3. **Serialize captures:** Ensure only one `getSources()` call is in-flight at a time using a mutex/queue pattern to prevent concurrent calls from piling up during rapid clicking.
4. **Invalidate cache** on display-change events (`screen.on('display-added')`, `screen.on('display-removed')`) to handle monitor configuration changes mid-session.
