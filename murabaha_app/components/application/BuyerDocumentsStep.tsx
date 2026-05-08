"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UploadValue } from "@/lib/application-flow";
import { FaceCaptureCard } from "./FaceCaptureCard";
import styles from "./ApplicationFlow.module.css";

type BuyerDocumentsStepProps = {
  buyerPassportMain: UploadValue | null;
  buyerPassportResidence: UploadValue | null;
  buyerSelfie: UploadValue | null;
  error: string | null;
  onBuyerPassportMainSelect: (file: File) => void | Promise<void>;
  onBuyerPassportResidenceSelect: (file: File) => void | Promise<void>;
  onBuyerSelfieSelect: (file: File) => void | Promise<void>;
  onBuyerPassportMainClear: () => void;
  onBuyerPassportResidenceClear: () => void;
  onBuyerSelfieClear: () => void;
};

type PassportModalProps = {
  mainValue: UploadValue | null;
  residenceValue: UploadValue | null;
  onMainSelect: (file: File) => void | Promise<void>;
  onResidenceSelect: (file: File) => void | Promise<void>;
  onMainClear: () => void;
  onResidenceClear: () => void;
  onClose: () => void;
};

function PassportModal({
  mainValue,
  residenceValue,
  onMainSelect,
  onResidenceSelect,
  onMainClear,
  onResidenceClear,
  onClose,
}: PassportModalProps) {
  const bothInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const residenceInputRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const handleBothSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files[0]) void onMainSelect(files[0]);
    if (files[1]) void onResidenceSelect(files[1]);
    e.target.value = "";
  };

  return createPortal(
    <div
      className={styles.passportBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Загрузка паспорта"
    >
      <div className={styles.passportModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Паспорт покупателя</span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <div className={styles.passportModalBody}>
          <p className={styles.mutedText}>Загрузите обе страницы. Можно выбрать два файла сразу.</p>

          <button
            type="button"
            className={styles.secondaryButton}
            style={{ width: "100%" }}
            onClick={() => bothInputRef.current?.click()}
          >
            Выбрать оба фото сразу
          </button>
          <input
            ref={bothInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.uploadInput}
            onChange={handleBothSelect}
          />

          {/* Slot 1 — главная */}
          <div className={styles.passportSlot}>
            <div className={styles.passportSlotLabel}>
              <span>Лицевая сторона</span>
              {mainValue && <span className={styles.uploadDone}>✓</span>}
            </div>
            <div className={styles.uploadActions}>
              {mainValue ? (
                <>
                  <button type="button" className={styles.ghostButton} onClick={() => setPreviewSrc(mainValue.previewUrl)}>Посмотреть</button>
                  <button type="button" className={styles.uploadButton} onClick={() => mainInputRef.current?.click()}>Заменить</button>
                  <button type="button" className={styles.deleteButton} onClick={onMainClear} aria-label="Удалить">✕</button>
                </>
              ) : (
                <button type="button" className={styles.uploadButton} onClick={() => mainInputRef.current?.click()}>Загрузить</button>
              )}
            </div>
            <input
              ref={mainInputRef}
              type="file"
              accept="image/*"
              className={styles.uploadInput}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onMainSelect(f); e.target.value = ""; }}
            />
          </div>

          {/* Slot 2 — прописка */}
          <div className={styles.passportSlot}>
            <div className={styles.passportSlotLabel}>
              <span>Страница с пропиской</span>
              {residenceValue && <span className={styles.uploadDone}>✓</span>}
            </div>
            <div className={styles.uploadActions}>
              {residenceValue ? (
                <>
                  <button type="button" className={styles.ghostButton} onClick={() => setPreviewSrc(residenceValue.previewUrl)}>Посмотреть</button>
                  <button type="button" className={styles.uploadButton} onClick={() => residenceInputRef.current?.click()}>Заменить</button>
                  <button type="button" className={styles.deleteButton} onClick={onResidenceClear} aria-label="Удалить">✕</button>
                </>
              ) : (
                <button type="button" className={styles.uploadButton} onClick={() => residenceInputRef.current?.click()}>Загрузить</button>
              )}
            </div>
            <input
              ref={residenceInputRef}
              type="file"
              accept="image/*"
              className={styles.uploadInput}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onResidenceSelect(f); e.target.value = ""; }}
            />
          </div>
        </div>
      </div>

      {/* Inline preview overlay — within the same portal so z-index stacks correctly */}
      {previewSrc && (
        <div
          className={styles.passportPreviewLayer}
          onClick={() => setPreviewSrc(null)}
          role="img"
          aria-label="Просмотр фото"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} className={styles.passportPreviewImg} alt="Просмотр" />
          <button type="button" className={styles.passportPreviewClose} onClick={() => setPreviewSrc(null)} aria-label="Закрыть">✕</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

export function BuyerDocumentsStep({
  buyerPassportMain,
  buyerPassportResidence,
  buyerSelfie,
  error,
  onBuyerPassportMainSelect,
  onBuyerPassportResidenceSelect,
  onBuyerSelfieSelect,
  onBuyerPassportMainClear,
  onBuyerPassportResidenceClear,
  onBuyerSelfieClear,
}: BuyerDocumentsStepProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const uploadedCount = [buyerPassportMain, buyerPassportResidence].filter(Boolean).length;
  const allUploaded = uploadedCount === 2;

  return (
    <>
      <p className={styles.mutedText}>Паспорт покупателя и одно фото-селфи с паспортом.</p>

      <div className={styles.cardGrid}>
        <article className={styles.uploadCard}>
          <div className={styles.uploadCardHeader}>
            <div className={styles.uploadCardTitleRow}>
              <strong>Паспорт</strong>
              {allUploaded && <span className={styles.uploadDone}>✓</span>}
            </div>
            <span className={styles.uploadCardDesc}>
              {uploadedCount === 0
                ? "Лицевая сторона + прописка"
                : uploadedCount === 1
                  ? "Загружено 1 из 2 фото"
                  : "Оба фото загружены"}
            </span>
          </div>
          <div className={styles.uploadActions}>
            <button
              type="button"
              className={allUploaded ? styles.ghostButton : styles.uploadButton}
              onClick={() => setModalOpen(true)}
            >
              {uploadedCount === 0 ? "Загрузить" : "Изменить"}
            </button>
          </div>
        </article>

        <FaceCaptureCard
          value={buyerSelfie}
          onCapture={onBuyerSelfieSelect}
          onClear={onBuyerSelfieClear}
        />
      </div>

      {modalOpen && (
        <PassportModal
          mainValue={buyerPassportMain}
          residenceValue={buyerPassportResidence}
          onMainSelect={onBuyerPassportMainSelect}
          onResidenceSelect={onBuyerPassportResidenceSelect}
          onMainClear={onBuyerPassportMainClear}
          onResidenceClear={onBuyerPassportResidenceClear}
          onClose={() => setModalOpen(false)}
        />
      )}

      {error ? <span className={styles.error}>{error}</span> : null}
    </>
  );
}

