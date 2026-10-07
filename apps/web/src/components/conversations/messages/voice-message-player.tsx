"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/format-duration";

interface VoiceMessagePlayerProps {
  src: string;
  waveform: number[];
}

export default function VoiceMessagePlayer({
  src,
  waveform,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  }

  function seekTo(clientX: number, element: HTMLDivElement) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;

    const bounds = element.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - bounds.left) / bounds.width),
    );

    audio.currentTime = ratio * audio.duration;
  }

  function handleWaveformKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 3);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 3);
    } else if (event.key === "Home") {
      event.preventDefault();
      audio.currentTime = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      audio.currentTime = audio.duration;
    }
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        onClick={() => void togglePlayback()}
        className="size-10 shrink-0 rounded-full"
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Voice message position"
          aria-valuemin={0}
          aria-valuemax={Math.ceil(duration)}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
          onClick={(event: MouseEvent<HTMLDivElement>) =>
            seekTo(event.clientX, event.currentTarget)
          }
          onKeyDown={handleWaveformKeyDown}
          className="flex h-10 cursor-pointer items-center justify-between gap-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {waveform.map((value, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={[
                "min-w-[2px] flex-1 rounded-full transition-colors",
                index / waveform.length <= progress
                  ? "bg-primary"
                  : "bg-muted-foreground/40",
              ].join(" ")}
              style={{
                height: `${Math.max(4, Math.round((value / 100) * 32))}px`,
              }}
            />
          ))}
        </div>

        <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}
