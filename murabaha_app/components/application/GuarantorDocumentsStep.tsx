import type { UploadValue } from "@/lib/application-flow";
import { FileUploadCard } from "./FileUploadCard";
import styles from "./ApplicationFlow.module.css";

type GuarantorUploadSet = {
  passportMain: UploadValue | null;
  passportResidence: UploadValue | null;
};

type GuarantorDocumentsStepProps = {
  guarantorsCount: number;
  guarantor1: GuarantorUploadSet;
  guarantor2: GuarantorUploadSet;
  error: string | null;
  onSelect: (field: string, file: File) => void | Promise<void>;
  onClear: (field: string) => void;
  submitting: boolean;
  submitError: string | null;
};

function GuarantorBlock({
  label,
  prefix,
  value,
  onSelect,
  onClear,
}: {
  label: string;
  prefix: string;
  value: GuarantorUploadSet;
  onSelect: (field: string, file: File) => void | Promise<void>;
  onClear: (field: string) => void;
}) {
  return (
    <div className={styles.cardGrid}>
      <FileUploadCard
        title={`${label}: главная`}
        description="Главная страница паспорта"
        placeholder="Загрузите главную страницу"
        value={value.passportMain}
        onSelect={(file) => onSelect(`${prefix}PassportMain`, file)}
        onClear={() => onClear(`${prefix}PassportMain`)}
      />

      <FileUploadCard
        title={`${label}: прописка`}
        description="Страница с регистрацией"
        placeholder="Загрузите страницу с пропиской"
        value={value.passportResidence}
        onSelect={(file) => onSelect(`${prefix}PassportResidence`, file)}
        onClear={() => onClear(`${prefix}PassportResidence`)}
      />
    </div>
  );
}

export function GuarantorDocumentsStep({
  guarantorsCount,
  guarantor1,
  guarantor2,
  error,
  onSelect,
  onClear,
  submitting,
  submitError,
}: GuarantorDocumentsStepProps) {
  return (
    <>
      <div className={`${styles.banner} ${styles.bannerInfo}`}>
        {guarantorsCount === 1 ? "Нужен 1 поручитель." : "Нужны 2 поручителя."}
      </div>

      <GuarantorBlock
        label="Поручитель 1"
        prefix="guarantor1"
        value={guarantor1}
        onSelect={onSelect}
        onClear={onClear}
      />

      {guarantorsCount === 2 ? (
        <GuarantorBlock
          label="Поручитель 2"
          prefix="guarantor2"
          value={guarantor2}
          onSelect={onSelect}
          onClear={onClear}
        />
      ) : null}

      {error ? <span className={styles.error}>{error}</span> : null}
      {submitError ? <span className={styles.error}>{submitError}</span> : null}
      {submitting ? <span className={styles.helper}>Отправляем заявку и сохраняем фото на сервере...</span> : null}
    </>
  );
}
