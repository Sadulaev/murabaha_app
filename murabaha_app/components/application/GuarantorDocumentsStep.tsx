"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UploadValue } from "@/lib/application-flow";
import styles from "./ApplicationFlow.module.css";

type GuarantorUploadSet = {
  passportMain: UploadValue | null;
  passportResidence: UploadValue | null;
  phone: string;
};

type GuarantorDocumentsStepProps = {
  guarantorsCount: number;
  guarantor1: GuarantorUploadSet;
  guarantor2: GuarantorUploadSet;
  error: string | null;
  onSelect: (field: string, file: File) => void | Promise<void>;
  onClear: (field: string) => void;
  onPhoneChange: (guarantorKey: "guarantor1" | "guarantor2", phone: string) => void;
  submitting: boolean;
  submitError: string | null;
};

type GuarantorModalProps = {
  label: string;
  phone: string;
  mainValue: UploadValue | null;
  residenceValue: UploadValue | null;
  onPhoneChange: (phone: string) => void;
  onMainSelect: (file: File) => void | Promise<void>;
  onResidenceSelect: (file: File) => void | Promise<void>;
  onMainClear: () => void;
  onResidenceClear: () => void;
  onClose: () => void;
};

function GuarantorPassportModal({
  label,
  phone,
  mainValue,
  residenceValue,
  onPhoneChange,
  onMainSelect,
  onResidenceSelect,
  onMainClear,
  onResidenceClear,
  onClose,
}: GuarantorModalProps) {
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
      aria-label="Загрузка паспорта поручителя"
    >
      <div className={styles.passportModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{label}</span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        <div className={styles.passportModalBody}>
          <div className={styles.field}>
            <label htmlFor={`${label}-phone`}>Номер телефона</label>
            <input
              id={`${label}-phone`}
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+7 (___) ___-__-__"
            />
          </div>

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

function GuarantorCard({
  label,
  prefix,
  value,
  onSelect,
  onClear,
  onPhoneChange,
}: {
  label: string;
  prefix: "guarantor1" | "guarantor2";
  value: GuarantorUploadSet;
  onSelect: (field: string, file: File) => void | Promise<void>;
  onClear: (field: string) => void;
  onPhoneChange: (guarantorKey: "guarantor1" | "guarantor2", phone: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const uploadedCount = [value.passportMain, value.passportResidence].filter(Boolean).length;
  const allDone = uploadedCount === 2 && value.phone.trim().length > 0;

  return (
    <>
      <article className={styles.uploadCard}>
        <div className={styles.uploadCardHeader}>
          <div className={styles.uploadCardTitleRow}>
            <strong>{label}</strong>
            {allDone && <span className={styles.uploadDone}>✓</span>}
          </div>
          <span className={styles.uploadCardDesc}>
            {uploadedCount === 0
              ? "Паспорт • Телефон"
              : uploadedCount === 1
                ? "Загружено 1 из 2 фото"
                : "Оба фото загружены"}
          </span>
        </div>
        <div className={styles.uploadActions}>
          <button
            type="button"
            className={allDone ? styles.ghostButton : styles.uploadButton}
            onClick={() => setModalOpen(true)}
          >
            {uploadedCount === 0 ? "Загрузить" : "Изменить"}
          </button>
        </div>
      </article>

      {modalOpen && (
        <GuarantorPassportModal
          label={label}
          phone={value.phone}
          mainValue={value.passportMain}
          residenceValue={value.passportResidence}
          onPhoneChange={(phone) => onPhoneChange(prefix, phone)}
          onMainSelect={(file) => onSelect(`${prefix}PassportMain`, file)}
          onResidenceSelect={(file) => onSelect(`${prefix}PassportResidence`, file)}
          onMainClear={() => onClear(`${prefix}PassportMain`)}
          onResidenceClear={() => onClear(`${prefix}PassportResidence`)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

export function GuarantorDocumentsStep({
  guarantorsCount,
  guarantor1,
  guarantor2,
  error,
  onSelect,
  onClear,
  onPhoneChange,
  submitting,
  submitError,
}: GuarantorDocumentsStepProps) {
  return (
    <>
      <p className={styles.mutedText}>
        {guarantorsCount === 1
          ? "Паспорт поручителя и его номер телефона."
          : "Паспорта двух поручителей и их номера телефонов."}
      </p>

      <div className={styles.cardGrid}>
        <GuarantorCard
          label="Поручитель 1"
          prefix="guarantor1"
          value={guarantor1}
          onSelect={onSelect}
          onClear={onClear}
          onPhoneChange={onPhoneChange}
        />

        {guarantorsCount === 2 ? (
          <GuarantorCard
            label="Поручитель 2"
            prefix="guarantor2"
            value={guarantor2}
            onSelect={onSelect}
            onClear={onClear}
            onPhoneChange={onPhoneChange}
          />
        ) : null}
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
      {submitError ? <span className={styles.error}>{submitError}</span> : null}
      {submitting ? <span className={styles.helper}>Отправляем заявку и сохраняем фото на сервере...</span> : null}
    </>
  );
}

