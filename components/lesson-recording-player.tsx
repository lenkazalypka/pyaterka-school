"use client";

import { useCallback, useRef, useState } from "react";
import { saveLessonPosition } from "@/app/student/lessons/actions";

function timestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LessonRecordingPlayer({
  lessonId,
  src,
  title,
  initialPositionSeconds,
}: {
  lessonId: string;
  src: string;
  title: string;
  initialPositionSeconds: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(initialPositionSeconds);
  const inFlight = useRef(false);
  const queued = useRef<number | null>(null);
  const [status, setStatus] = useState(initialPositionSeconds > 0 ? `Продолжим с ${timestamp(initialPositionSeconds)}` : "Позиция сохраняется автоматически");
  const [saveFailed, setSaveFailed] = useState(false);

  const persist = useCallback(async (rawPosition: number) => {
    const positionSeconds = Math.max(0, Math.min(86400, Math.floor(rawPosition)));
    if (Math.abs(positionSeconds - lastSaved.current) < 2) return;
    if (inFlight.current) { queued.current = positionSeconds; return; }
    inFlight.current = true;
    let nextPosition: number | null = positionSeconds;
    while (nextPosition !== null) {
      const previousPosition = lastSaved.current;
      lastSaved.current = nextPosition;
      const result = await saveLessonPosition({ lessonId, positionSeconds: nextPosition });
      if (!result.ok) lastSaved.current = previousPosition;
      setSaveFailed(!result.ok);
      setStatus(result.ok ? `Сохранено на ${timestamp(nextPosition)}` : result.error ?? "Позиция не сохранена");
      nextPosition = queued.current;
      queued.current = null;
    }
    inFlight.current = false;
  }, [lessonId]);

  return <div className="student-video-player">
    <video
      ref={video}
      controls
      playsInline
      preload="metadata"
      src={src}
      aria-label={title}
      onLoadedMetadata={() => {
        const element = video.current;
        if (!element || initialPositionSeconds <= 0 || initialPositionSeconds >= element.duration - 3) return;
        element.currentTime = initialPositionSeconds;
      }}
      onTimeUpdate={() => {
        const position = video.current?.currentTime ?? 0;
        if (position - lastSaved.current >= 20) void persist(position);
      }}
      onPause={() => void persist(video.current?.currentTime ?? 0)}
      onEnded={() => void persist(video.current?.duration ?? 0)}
    >Ваш браузер не поддерживает воспроизведение видео.</video>
    <small role={saveFailed ? "alert" : undefined}>{status}</small>
  </div>;
}
