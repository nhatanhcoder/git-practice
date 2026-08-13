# 🎬 Flow: Video Submission Cleanup

> MediaRecorder → compress → upload R2 → grade → videoExpiresAt → cleanup  
> **Status**: Planned (Sprint 4)

---

## Overview

Speaking/video submissions for advanced writing assignments:
1. Student records a video in the browser (MediaRecorder API)
2. Video is compressed (client-side)
3. Uploaded to Cloudflare R2 (object storage)
4. Teacher watches the video to grade it
5. After 30–60 days the video is deleted (cost saving)

---

## Flow

```
Student Browser           NestJS BE              Cloudflare R2
     │                        │                       │
     │── MediaRecorder.start()│                       │
     │   [record video]       │                       │
     │── MediaRecorder.stop() │                       │
     │   [chunks → Blob]      │                       │
     │── compress (ffmpeg.wasm)│                      │
     │── POST /upload ────────►│                      │
     │   multipart/form-data   │── PUT object ────────►│
     │                         │◄── R2 URL ────────────│
     │                         │── Save videoUrl,      │
     │                         │   videoExpiresAt (30d)│
     │◄── { videoUrl } ────────│                       │
```

---

## Cleanup Job (Scheduled)

```typescript
// NestJS @Cron('0 2 * * *') — runs at 2am every day
async cleanupExpiredVideos() {
  const expired = await this.prisma.attemptAnswer.findMany({
    where: { videoExpiresAt: { lte: new Date() }, videoUrl: { not: null } }
  });
  for (const answer of expired) {
    await r2.deleteObject(answer.videoUrl);
    await this.prisma.attemptAnswer.update({
      where: { id: answer.id },
      data: { videoUrl: null }
    });
  }
}
```

---

## Schema Fields Needed

```
AttemptAnswer {
  ...existing fields...
  videoUrl?: string        // R2 object key
  videoExpiresAt?: DateTime // soft delete date
}
```

---

## TODO

- [ ] Choose the retention period: 30 or 60 days?
- [ ] Notify the student before their video is deleted?
- [ ] R2 bucket config + CORS
