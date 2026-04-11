---
status: pending
priority: p3
issue_id: "019"
tags: [code-review, performance]
---

## Problem Statement
Steps uploaded sequentially in a for-loop. 40 steps x ~200ms per HTTP round-trip = ~8 seconds minimum. With retries, 20+ seconds.

## Findings
- `src/main/api-client.ts` lines 133-173
- The upload loop awaits each step individually before starting the next.
- No concurrency, so total upload time scales linearly with step count.
- Users see a long spinner after clicking "Upload" with no way to cancel.

## Proposed Solution
Upload 3-5 steps concurrently using a simple pool (e.g., a `Promise` semaphore or chunked `Promise.all`). Include a `position` field in each request to maintain ordering on the server side regardless of completion order.
