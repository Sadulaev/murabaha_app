"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./FaceCaptureModal.module.css";

type FaceCaptureModalProps = {
  onCapture: (file: File) => void | Promise<void>;
  onClose: () => void;
};

type CameraState = "starting" | "ready" | "error";

export function FaceCaptureModal({ onCapture, onClose }: FaceCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
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
  }, []);

  // Start camera on mount, clean up on unmount
  useEffect(() => {
    void startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopStream();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, stopStream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraState !== "ready") return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror to match selfie expectation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopStream();
        void onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }, [cameraState, onCapture, onClose, stopStream]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [onClose, stopStream]);

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Сделать селфи с паспортом"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Селфи с паспортом</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {cameraState === "starting" && (
          <div className={styles.starting}>
            <span className={styles.startingText}>Инициализация камеры…</span>
          </div>
        )}

        {/* Error */}
        {cameraState === "error" && (
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>⚠</span>
            <p className={styles.errorText}>{errorMsg}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => void startCamera()}
            >
              Повторить
            </button>
          </div>
        )}

        {/* Camera — always in DOM so videoRef attaches; hidden until ready */}
        <div
          className={styles.cameraWrap}
          style={{ display: cameraState === "ready" ? undefined : "none" }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className={styles.video} playsInline muted />
          <canvas ref={canvasRef} className={styles.canvas} />

          <div className={styles.statusBar}>
            <span className={styles.statusText}>Держите паспорт рядом с лицом и нажмите кнопку</span>
          </div>
        </div>

        {cameraState === "ready" && (
          <button
            type="button"
            className={styles.captureBtn}
            onClick={capturePhoto}
            aria-label="Сделать снимок"
          >
            <span className={styles.captureDot} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
