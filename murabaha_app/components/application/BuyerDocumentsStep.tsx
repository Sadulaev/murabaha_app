import type { UploadValue } from "@/lib/application-flow";
import { FaceCaptureCard } from "./FaceCaptureCard";
import { FileUploadCard } from "./FileUploadCard";
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
  return (
    <>
      <p className={styles.mutedText}>Паспорт покупателя и одно фото лица.</p>

      <div className={styles.cardGridCompact}>
        <FileUploadCard
          title="Паспорт: главная"
          description="Разворот с ФИО и серией документа"
          placeholder="Загрузите главную страницу паспорта"
          value={buyerPassportMain}
          onSelect={onBuyerPassportMainSelect}
          onClear={onBuyerPassportMainClear}
        />

        <FileUploadCard
          title="Паспорт: прописка"
          description="Страница с адресом регистрации"
          placeholder="Загрузите страницу с пропиской"
          value={buyerPassportResidence}
          onSelect={onBuyerPassportResidenceSelect}
          onClear={onBuyerPassportResidenceClear}
        />

        <FaceCaptureCard
          value={buyerSelfie}
          onCapture={onBuyerSelfieSelect}
          onClear={onBuyerSelfieClear}
        />
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
    </>
  );
}
