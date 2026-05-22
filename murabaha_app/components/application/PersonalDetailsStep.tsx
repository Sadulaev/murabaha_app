import { useId } from "react";
import type { PersonalDetails, UploadValue } from "@/lib/application-flow";
import styles from "./ApplicationFlow.module.css";

type PersonalDetailsStepProps = {
  details: PersonalDetails;
  rangeLabel: string;
  minDate: string;
  maxDate: string;
  productPhoto: UploadValue | null;
  error: string | null;
  onChange: (patch: Partial<PersonalDetails>) => void;
  onProductPhotoSelect: (file: File) => void | Promise<void>;
  onProductPhotoClear: () => void;
};

export function PersonalDetailsStep({
  details,
  rangeLabel,
  minDate,
  maxDate,
  productPhoto,
  error,
  onChange,
  onProductPhotoSelect,
  onProductPhotoClear,
}: PersonalDetailsStepProps) {
  const photoInputId = useId();

  return (
    <>
      <div className={styles.fieldsGrid}>
        <div className={styles.field}>
          <label htmlFor="firstName">Имя</label>
          <input
            id="firstName"
            type="text"
            value={details.firstName}
            onChange={(event) => onChange({ firstName: event.target.value })}
            placeholder="Введите имя"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="lastName">Фамилия</label>
          <input
            id="lastName"
            type="text"
            value={details.lastName}
            onChange={(event) => onChange({ lastName: event.target.value })}
            placeholder="Введите фамилию"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="phone">Номер телефона</label>
          <input
            id="phone"
            type="tel"
            value={details.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder="+7 (___) ___-__-__"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="firstPaymentDate">Дата первого платежа</label>
          <input
            id="firstPaymentDate"
            type="date"
            min={minDate}
            max={maxDate}
            value={details.firstPaymentDate}
            onChange={(event) => onChange({ firstPaymentDate: event.target.value })}
          />
          <span className={styles.dateHint}>{rangeLabel}</span>
        </div>
      </div>

      <div className={styles.productSection}>
        <p className={styles.productSectionLabel}>
          Фото товара, название магазина и номер продавца необязательны, но помогут быстрее оформить заявку.
        </p>

        <div className={styles.productRow}>
          <div className={styles.storeFields}>
            <div className={styles.field}>
              <label htmlFor="storeName">Название магазина</label>
              <input
                id="storeName"
                type="text"
                value={details.storeName}
                onChange={(event) => onChange({ storeName: event.target.value })}
                placeholder="Например: DNS, Wildberries..."
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="sellerPhone">Номер продавца</label>
              <input
                id="sellerPhone"
                type="tel"
                value={details.sellerPhone}
                onChange={(event) => onChange({ sellerPhone: event.target.value })}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>

          <article className={`${styles.uploadCard} ${styles.productPhotoCard}`}>
            <div className={styles.uploadCardHeader}>
              <div className={styles.uploadCardTitleRow}>
                <strong>Фото товара</strong>
                {productPhoto ? <span className={styles.uploadDone}>✓</span> : null}
              </div>
              <span className={styles.uploadCardDesc}>
                {productPhoto ? productPhoto.file.name : "Скриншот или фото"}
              </span>
            </div>
            <div className={styles.uploadActions}>
              {productPhoto ? (
                <button type="button" className={styles.deleteButton} onClick={onProductPhotoClear} aria-label="Удалить">
                  ✕
                </button>
              ) : null}
              <label htmlFor={photoInputId} className={styles.uploadButton}>
                {productPhoto ? "Заменить" : "Загрузить"}
              </label>
              <input
                id={photoInputId}
                type="file"
                accept="image/*"
                className={styles.uploadInput}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onProductPhotoSelect(f); e.target.value = ""; }}
              />
            </div>
          </article>
        </div>
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
    </>
  );
}

