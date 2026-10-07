"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Send, Square, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/format-duration";

interface VoiceMessageRecorderProps {
  disabled?: boolean;
  onSend: (file: File, waveform: number[]) => Promise<void>;
}

type RecorderStatus = "idle" | "recording" | "preview";

const MAX_RECORDING_SECONDS = 120;
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

const WAVEFORM_BAR_COUNT = 48;

async function createWaveform(blob: Blob): Promise<number[]> {
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer(),
    );
    const samples = audioBuffer.getChannelData(0);
    const levels: number[] = [];

    for (let index = 0; index < WAVEFORM_BAR_COUNT; index += 1) {
      const start = Math.floor((index * samples.length) / WAVEFORM_BAR_COUNT);
      const end = Math.floor(
        ((index + 1) * samples.length) / WAVEFORM_BAR_COUNT,
      );

      let sumOfSquares = 0;

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        sumOfSquares += samples[sampleIndex] ** 2;
      }

      const sampleCount = Math.max(1, end - start);
      levels.push(Math.sqrt(sumOfSquares / sampleCount));
    }

    const peak = Math.max(...levels);

    return levels.map((level) =>
      peak === 0 ? 8 : Math.max(8, Math.round((level / peak) * 100)),
    );
  } finally {
    if (audioContext.state !== "closed") {
      await audioContext.close();
    }
  }
}
export default function VoiceMessageRecorder({
  disabled = false,
  onSend,
}: VoiceMessageRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardOnStopRef = useRef(false);
  const startedAtRef = useRef(0);

  function stopMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordingWaveform([]);
    setPreviewUrl(null);
    setRecordingFile(null);
    setElapsedSeconds(0);
    setStatus("idle");
  }

  function discardRecording() {
    discardOnStopRef.current = true;

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    stopMicrophone();
    chunksRef.current = [];
    setError(null);
    clearPreview();
  }

  async function startRecording() {
    setError(null);

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Voice recording is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      discardOnStopRef.current = false;

      const supportedMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      const selectedMimeType = supportedMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
      );

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopMicrophone();
        recorderRef.current = null;

        if (discardOnStopRef.current) {
          discardOnStopRef.current = false;
          chunksRef.current = [];
          return;
        }

        const mimeType = (
          recorder.mimeType ||
          chunksRef.current[0]?.type ||
          "audio/webm"
        )
          .split(";")[0]
          .toLowerCase();

        const extension = MIME_EXTENSIONS[mimeType];

        if (!extension) {
          chunksRef.current = [];
          setStatus("idle");
          setError("This browser created an unsupported audio format.");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size > MAX_AUDIO_SIZE_BYTES) {
          setStatus("idle");
          setElapsedSeconds(0);
          setError("This recording is too large. The limit is 10 MB.");
          return;
        }

        try {
          const waveform = await createWaveform(blob);
          const file = new File(
            [blob],
            `voice-message-${Date.now()}.${extension}`,
            { type: mimeType },
          );

          setRecordingFile(file);
          setRecordingWaveform(waveform);
          setPreviewUrl(URL.createObjectURL(file));
          setStatus("preview");
        } catch {
          setStatus("idle");
          setError("Could not prepare the audio preview. Please record again.");
        }
      };

      recorder.onerror = () => {
        stopMicrophone();
        recorderRef.current = null;
        setStatus("idle");
        setError("Recording failed. Please try again.");
      };

      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      recorder.start();
      setStatus("recording");
    } catch {
      stopMicrophone();
      setStatus("idle");
      setError("Allow microphone access to record a voice message.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function sendRecording() {
    if (!recordingFile || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSend(recordingFile, recordingWaveform);
      clearPreview();
    } catch {
      setError("The voice message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    if (status !== "recording") {
      return;
    }

    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsedSeconds(seconds);

      if (seconds >= MAX_RECORDING_SECONDS) {
        recorderRef.current?.stop();
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      stopMicrophone();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Record a voice message"
        title="Record a voice message"
        disabled={disabled || isSending}
        onClick={() => {
          if (status === "idle") {
            void startRecording();
          }
        }}
        className="mb-0.5 size-10 shrink-0 rounded-xl text-muted-foreground"
      >
        <Mic />
      </Button>

      {status !== "idle" || error ? (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[100] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-4 text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              {status === "recording"
                ? "Recording voice message"
                : status === "preview"
                  ? "Preview voice message"
                  : "Voice message"}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close voice recorder"
              onClick={discardRecording}
            >
              <X />
            </Button>
          </div>

          {status === "recording" ? (
            <>
              <p className="mt-3 text-center text-2xl font-semibold tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Maximum recording time: 2 minutes
              </p>
              <div className="mt-4 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={discardRecording}
                >
                  <Trash2 />
                  Discard
                </Button>
                <Button type="button" onClick={stopRecording}>
                  <Square />
                  Stop
                </Button>
              </div>
            </>
          ) : null}

          {status === "preview" && previewUrl ? (
            <>
              <audio
                controls
                preload="metadata"
                src={previewUrl}
                className="mt-3 h-10 w-full"
              />
              <div className="mt-3 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSending}
                  onClick={discardRecording}
                >
                  <Trash2 />
                  Discard
                </Button>
                <Button
                  type="button"
                  disabled={isSending}
                  onClick={() => void sendRecording()}
                >
                  {isSending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  Send voice
                </Button>
              </div>
            </>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {status === "recording" ? (
            <span className="sr-only" aria-live="polite">
              Recording for {formatDuration(elapsedSeconds)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
