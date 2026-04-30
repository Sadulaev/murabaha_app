"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./FaceCaptureCard.module.css";

type FaceCaptureCardProps = {
  value: { previewUrl: string } | null;
  onCapture: (file: File) => void | Promise<void>;
  onClear: () => void;
};

type CameraState = "idle" | "starting" | "ready" | "done" | "error";

export function FaceCaptureCard({ value, onCapture, onClear }: FaceCaptureCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const startCamera = async () => {
    setErrorMsg(null);
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 920 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch {
      setCameraState("error");
      setErrorMsg("Нет доступа к камере. Разрешите доступ в настройках браузера.");
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraState !== "ready") return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image to match selfie expectation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopStream();
        setCameraState("done");
        void onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [cameraState, onCapture, stopStream]);

  const handleRetake = () => {
    onClear();
    setCameraState("idle");
    setErrorMsg(null);
  };

  // Show captured preview
  if (value && cameraState === "done") {
    return (
      <div className={styles.card}>
        <div className={styles.previewWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="Фото лица" className={styles.preview} />
          <div className={styles.previewBadge}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.badgeCheck}>
              <circle cx="8" cy="8" r="8" fill="#1f7255" />
              <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Верификация пройдена
          </div>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.cardTitle}>Фото лица</span>
          <button type="button" className={styles.retakeBtn} onClick={handleRetake}>
            Переснять
          </button>
        </div>
      </div>
    );
  }

  // Camera view
  if (cameraState === "starting" || cameraState === "ready") {
    return (
      <div className={styles.card}>
        <div className={styles.cameraWrap}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className={styles.video} playsInline muted />
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* Face guide overlay */}
          <div className={styles.overlay}>
            <div className={styles.faceFrame}>
              <span className={`${styles.corner} ${styles.cornerTL}`} />
              <span className={`${styles.corner} ${styles.cornerTR}`} />
              <span className={`${styles.corner} ${styles.cornerBL}`} />
              <span className={`${styles.corner} ${styles.cornerBR}`} />
            </div>
          </div>
        </div>

        {cameraState === "ready" && (
          <button type="button" className={styles.captureBtn} onClick={capturePhoto}>
            <span className={styles.captureDot} />
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (cameraState === "error") {
    return (
      <div className={styles.card}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠</span>
          <p className={styles.errorText}>{errorMsg}</p>
          <button type="button" className={styles.startBtn} onClick={startCamera}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Idle state — prompt to open camera
  return (
    <div className={styles.card}>
      <div className={styles.idleState}>
        <div className={styles.cameraIcon} aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <rect x="4" y="10" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="22" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M14 10l2-4h8l2 4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </div>
        <span className={styles.idleTitle}>Фото лица</span>
        <span className={styles.idleDesc}>Биометрическая верификация</span>
        <button type="button" className={styles.startBtn} onClick={startCamera}>
          Открыть камеру
        </button>
      </div>
    </div>
  );
}
