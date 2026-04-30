"use client";

import { useId, useState } from "react";
import type { UploadValue } from "@/lib/application-flow";
import { PhotoPreviewModal } from "./PhotoPreviewModal";
import styles from "./ApplicationFlow.module.css";

type FileUploadCardProps = {
  title: string;
  description: string;
  placeholder: string;
  accept?: string;
  capture?: "user" | "environment";
  value: UploadValue | null;
  onSelect: (file: File) => void | Promise<void>;
  onClear: () => void;
  selectLabel?: string;
  replaceLabel?: string;
};

export function FileUploadCard({
  title,
  description,
  placeholder,
  accept = "image/*",
  capture,
  value,
  onSelect,
  onClear,
  selectLabel = "Загрузить",
  replaceLabel = "Заменить",
}: FileUploadCardProps) {
  const inputId = useId();
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <article className={styles.uploadCard}>
        <div className={styles.uploadCardHeader}>
          <div className={styles.uploadCardTitleRow}>
            <strong>{title}</strong>
            {value ? <span className={styles.uploadDone}>✓</span> : null}
          </div>
          <span className={styles.uploadCardDesc}>{value ? value.file.name : placeholder}</span>
        </div>

        <div className={styles.uploadActions}>
          {value ? (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setPreviewOpen(true)}
            >
              Посмотреть
            </button>
          ) : null}

          <label htmlFor={inputId} className={styles.uploadButton}>
            {value ? replaceLabel : selectLabel}
          </label>
          <input
            id={inputId}
            className={styles.uploadInput}
            type="file"
            accept={accept}
            capture={capture}
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) {
                void onSelect(nextFile);
              }
              event.currentTarget.value = "";
            }}
          />

          {value ? (
            <button type="button" className={styles.deleteButton} onClick={onClear} aria-label="Удалить">
              ✕
            </button>
          ) : null}
        </div>
      </article>

      {previewOpen && value ? (
        <PhotoPreviewModal
          src={value.previewUrl}
          title={title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
