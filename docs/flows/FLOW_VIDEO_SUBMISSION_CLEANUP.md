# 🎬 Flow: Video Submission Cleanup

> MediaRecorder → compress → upload R2 → grade → videoExpiresAt → cleanup  
> **Status**: Planned (Sprint 4)

---

## Overview

Speaking/video submissions cho bài tập writing nâng cao:
1. Student record video trong browser (MediaRecorder API)
2. Nén video (client-side)
3. Upload lên Cloudflare R2 (object storage)
4. Teacher xem video để chấm
5. Sau 30-60 ngày: video bị xóa (cost saving)

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
// NestJS @Cron('0 2 * * *') — chay luc 2am moi ngay
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

- [ ] Chon retention period: 30 hay 60 ngay?
- [ ] Notify student truoc khi video bi xoa?
- [ ] R2 bucket config + CORS
