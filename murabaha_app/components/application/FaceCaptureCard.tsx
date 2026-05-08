"use client";

import { useState } from "react";
import { FaceCaptureModal } from "./FaceCaptureModal";
import { PhotoPreviewModal } from "./PhotoPreviewModal";
import styles from "./ApplicationFlow.module.css";

type FaceCaptureCardProps = {
  value: { previewUrl: string } | null;
  onCapture: (file: File) => void | Promise<void>;
  onClear: () => void;
};

export function FaceCaptureCard({ value, onCapture, onClear }: FaceCaptureCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Show captured preview — same style as FileUploadCard
  if (value) {
    return (
      <>
        <article className={styles.uploadCard}>
          <div className={styles.uploadCardHeader}>
            <div className={styles.uploadCardTitleRow}>
              <strong>Селфи с паспортом</strong>
              <span className={styles.uploadDone}>✓</span>
            </div>
            <span className={styles.uploadCardDesc}>Фото загружено</span>
          </div>

          <div className={styles.uploadActions}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setPreviewOpen(true)}
            >
              Просмотреть
            </button>
            <button type="button" className={styles.deleteButton} onClick={onClear} aria-label="Переснять">
              ✕
            </button>
          </div>
        </article>

        {previewOpen && (
          <PhotoPreviewModal
            src={value.previewUrl}
            title="Фото лица"
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </>
    );
  }

  // Idle state — prompt to open camera modal
  return (
    <>
      <article className={styles.uploadCard}>
        <div className={styles.uploadCardHeader}>
          <div className={styles.uploadCardTitleRow}>
            <strong>Селфи с паспортом</strong>
          </div>
          <span className={styles.uploadCardDesc}>Сфотографируйтесь с паспортом в руке</span>
        </div>

        <div className={styles.uploadActions}>
          <button type="button" className={styles.uploadButton} onClick={() => setModalOpen(true)}>
            Сделать фото
          </button>
        </div>
      </article>

      {modalOpen && (
        <FaceCaptureModal
          onCapture={onCapture}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
