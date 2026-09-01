"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

/* Audio placeholder: plays a fake "playing" animation (~1.2s).
   Real audio files come with the content dataset later. */
export function AudioButton({
  label,
  size = "md",
  className,
}: {
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const play = () => {
    if (playing) return;
    setPlaying(true);
    timer.current = setTimeout(() => setPlaying(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Phát âm thanh: ${label}${playing ? " (đang phát)" : ""}`}
      title={playing ? "Đang phát" : "Phát âm thanh (placeholder)"}
      className={clsx(
        "sp-press flex items-center justify-center rounded-full border",
        playing
          ? "border-sp-accent bg-sp-accent text-white"
          : "border-sp-line bg-sp-card text-sp-primary hover:bg-sp-primary-soft",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
    >
      {playing ? (
        <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="sp-audio-bar block w-[3px] rounded-full bg-white"
              style={{ height: "100%" }}
            />
          ))}
        </span>
      ) : (
        <Volume2 size={size === "sm" ? 14 : 17} aria-hidden="true" />
      )}
    </button>
  );
}
