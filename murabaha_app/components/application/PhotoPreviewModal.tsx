"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./ApplicationFlow.module.css";

type PhotoPreviewModalProps = {
  src: string;
  title: string;
  onClose: () => void;
};

export function PhotoPreviewModal({ src, title, onClose }: PhotoPreviewModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <img className={styles.modalImage} src={src} alt={title} />
      </div>
    </div>,
    document.body,
  );
}
