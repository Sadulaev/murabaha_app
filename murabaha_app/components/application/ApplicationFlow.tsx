"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createUploadValue,
  formatPhoneNumber,
  getDefaultFirstPaymentDate,
  getNextMonthDateRange,
  isValidPhone,
  revokeUploadValue,
  toDateInputValue,
  type CalculationSummary,
  type PersonalDetails,
  type UploadValue,
} from "@/lib/application-flow";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BuyerDocumentsStep } from "./BuyerDocumentsStep";
import { GuarantorDocumentsStep } from "./GuarantorDocumentsStep";
import { PersonalDetailsStep } from "./PersonalDetailsStep";
import { ProgressSteps } from "./ProgressSteps";
import styles from "./ApplicationFlow.module.css";

const DETAILS_STORAGE_KEY = "murabaha_app_details";

type ApplicationFlowProps = {
  calculation: CalculationSummary;
  onContacts: () => void;
  onStepChange?: (step: number) => void;
  expanded?: boolean;
};

type UploadState = {
  productPhoto: UploadValue | null;
  buyerPassportMain: UploadValue | null;
  buyerPassportResidence: UploadValue | null;
  buyerSelfie: UploadValue | null;
  guarantor1PassportMain: UploadValue | null;
  guarantor1PassportResidence: UploadValue | null;
  guarantor2PassportMain: UploadValue | null;
  guarantor2PassportResidence: UploadValue | null;
};

const initialUploads: UploadState = {
  productPhoto: null,
  buyerPassportMain: null,
  buyerPassportResidence: null,
  buyerSelfie: null,
  guarantor1PassportMain: null,
  guarantor1PassportResidence: null,
  guarantor2PassportMain: null,
  guarantor2PassportResidence: null,
};

function makeInitialDetails(): PersonalDetails {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    firstPaymentDate: getDefaultFirstPaymentDate(),
    storeName: "",
    sellerPhone: "",
  };
}

function loadSavedDetails(): Partial<PersonalDetails> {
  try {
    const raw = localStorage.getItem(DETAILS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersonalDetails>;
  } catch {
    return {};
  }
}

function saveDetails(details: PersonalDetails) {
  try {
    localStorage.setItem(DETAILS_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // ignore
  }
}

function clearSavedDetails() {
  try {
    localStorage.removeItem(DETAILS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function trimText(value: string) {
  return value.trim();
}

export function ApplicationFlow({ calculation, onContacts, onStepChange, expanded = false }: ApplicationFlowProps) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState<PersonalDetails>(() => ({
    ...makeInitialDetails(),
    ...loadSavedDetails(),
  }));
  const [uploads, setUploads] = useState<UploadState>(initialUploads);
  const [guarantorPhones, setGuarantorPhones] = useState({ guarantor1: "", guarantor2: "" });
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const uploadsRef = useRef(uploads);
  const flowRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 740px)");

  const { from, to } = useMemo(() => getNextMonthDateRange(), []);
  const minDate = toDateInputValue(from);
  const maxDate = toDateInputValue(to);
  const rangeLabel = `Выбор даты доступен с ${from.toLocaleDateString("ru-RU")} по ${to.toLocaleDateString("ru-RU")}.`;

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    onStepChange?.(step);
  }, [onStepChange, step]);

  const prevStepRef = useRef(step);

  // Scroll the flow block into view on mobile only when step actually changes value
  useEffect(() => {
    const prevStep = prevStepRef.current;
    prevStepRef.current = step;
    if (step === prevStep) return; // isMobile hydration change — ignore
    if (isMobile && flowRef.current) {
      setTimeout(() => {
        flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [isMobile, step]);

  useEffect(() => {
    return () => {
      Object.values(uploadsRef.current).forEach((value) => revokeUploadValue(value));
    };
  }, []);

  // Persist personal details to localStorage when they change
  useEffect(() => {
    const hasInput = details.firstName || details.lastName || details.phone;
    if (hasInput) {
      saveDetails(details);
    }
  }, [details]);

  const resetFlow = useCallback(() => {
    Object.values(uploadsRef.current).forEach((value) => revokeUploadValue(value));
    setStep(1);
    setDetails(makeInitialDetails());
    setUploads(initialUploads);
    setGuarantorPhones({ guarantor1: "", guarantor2: "" });
    setStepError(null);
    setSubmitError(null);
    setSubmitted(false);
    clearSavedDetails();
    onStepChange?.(1);
  }, [onStepChange]);

  const handleDetailsChange = (patch: Partial<PersonalDetails>) => {
    setStepError(null);
    setSubmitError(null);
    setDetails((current) => {
      const nextPhone = patch.phone !== undefined ? formatPhoneNumber(patch.phone) : current.phone;
      const nextSellerPhone =
        patch.sellerPhone !== undefined ? formatPhoneNumber(patch.sellerPhone) : current.sellerPhone;
      return {
        ...current,
        ...patch,
        phone: nextPhone,
        sellerPhone: nextSellerPhone,
      };
    });
  };

  const updateUpload = async (field: keyof UploadState, file: File) => {
    setStepError(null);
    setSubmitError(null);

    setUploads((current) => {
      const previous = current[field];
      if (previous) {
        revokeUploadValue(previous);
      }
      return current;
    });

    const nextValue = await createUploadValue(file);
    setUploads((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const clearUpload = (field: keyof UploadState) => {
    setStepError(null);
    setSubmitError(null);
    setUploads((current) => {
      revokeUploadValue(current[field]);
      return {
        ...current,
        [field]: null,
      };
    });
  };

  const validateStep2 = () => {
    if (!trimText(details.firstName) || !trimText(details.lastName)) {
      return "Заполните имя и фамилию.";
    }

    if (!isValidPhone(details.phone)) {
      return "Введите корректный номер телефона.";
    }

    if (!details.firstPaymentDate || details.firstPaymentDate < minDate || details.firstPaymentDate > maxDate) {
      return "Выберите дату первого платежа в разрешенном диапазоне.";
    }

    if (!uploads.productPhoto) {
      return "Загрузите фото товара.";
    }

    return null;
  };

  const validateStep3 = () => {
    if (!uploads.buyerPassportMain || !uploads.buyerPassportResidence || !uploads.buyerSelfie) {
      return "Загрузите две страницы паспорта и фото лица покупателя.";
    }

    return null;
  };

  const validateStep4 = () => {
    if (!uploads.guarantor1PassportMain || !uploads.guarantor1PassportResidence) {
      return "Загрузите паспорт поручителя 1.";
    }

    if (!isValidPhone(guarantorPhones.guarantor1)) {
      return "Введите корректный номер телефона поручителя 1.";
    }

    if (
      calculation.guarantorsCount === 2 &&
      (!uploads.guarantor2PassportMain || !uploads.guarantor2PassportResidence)
    ) {
      return "Для этой суммы нужны документы двух поручителей.";
    }

    if (calculation.guarantorsCount === 2 && !isValidPhone(guarantorPhones.guarantor2)) {
      return "Введите корректный номер телефона поручителя 2.";
    }

    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      setStepError(null);
      setStep(2);
      return;
    }

    const validationError = step === 2 ? validateStep2() : validateStep3();
    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError(null);
    setStep((current) => Math.min(current + 1, 4));
  };

  const handleBack = () => {
    setStepError(null);
    setSubmitError(null);
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleSubmit = async () => {
    const validationError = validateStep4();
    if (validationError) {
      setStepError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("cost", String(calculation.cost));
    formData.append("firstPayment", String(calculation.firstPayment));
    formData.append("period", String(calculation.period));
    formData.append("monthlyPayment", String(calculation.monthlyPayment));
    formData.append("summaryPayment", String(calculation.summaryPayment));
    formData.append("guarantorsCount", String(calculation.guarantorsCount));
    formData.append("firstName", trimText(details.firstName));
    formData.append("lastName", trimText(details.lastName));
    formData.append("phone", details.phone);
    formData.append("firstPaymentDate", details.firstPaymentDate);
    if (trimText(details.storeName)) {
      formData.append("storeName", trimText(details.storeName));
    }
    if (trimText(details.sellerPhone)) {
      formData.append("sellerPhone", trimText(details.sellerPhone));
    }
    formData.append("guarantor1Phone", guarantorPhones.guarantor1);
    if (calculation.guarantorsCount === 2) {
      formData.append("guarantor2Phone", guarantorPhones.guarantor2);
    }
    formData.append("buyerPassportMain", uploads.buyerPassportMain!.file);
    formData.append("buyerPassportResidence", uploads.buyerPassportResidence!.file);
    formData.append("buyerSelfie", uploads.buyerSelfie!.file);
    if (uploads.productPhoto) {
      formData.append("productPhoto", uploads.productPhoto.file);
    }
    formData.append("guarantor1PassportMain", uploads.guarantor1PassportMain!.file);
    formData.append("guarantor1PassportResidence", uploads.guarantor1PassportResidence!.file);

    if (calculation.guarantorsCount === 2) {
      formData.append("guarantor2PassportMain", uploads.guarantor2PassportMain!.file);
      formData.append("guarantor2PassportResidence", uploads.guarantor2PassportResidence!.file);
    }

    setSubmitting(true);
    setStepError(null);
    setSubmitError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/orders`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Не удалось отправить заявку.");
      }

      clearSavedDetails();
      setSubmitted(true);
      onStepChange?.(2);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div ref={flowRef} className={`${styles.flow} ${styles.flowExpanded}`}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="24" fill="rgba(32,134,96,0.12)" />
              <path d="M14 24.5l7 7 13-13" stroke="#1f7255" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className={styles.successTitle}>Заявка принята!</h3>
          <p className={styles.successText}>
            Ваша заявка успешно отправлена. Наш менеджер свяжется с вами в ближайшее время для подтверждения деталей.
          </p>
          <button type="button" className={styles.primaryButton} onClick={resetFlow}>
            Отправить другую заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={flowRef} className={expanded ? `${styles.flow} ${styles.flowExpanded}` : styles.flow}>
      <div className={styles.topBar}>
        <div className={styles.topCopy}>
          <span className={styles.eyebrow}>Оформление</span>
          <h3 className={styles.title}>Заявка в 4 шага.</h3>
        </div>
        <ProgressSteps currentStep={step} />
      </div>

      <div className={styles.viewport}>
        <div className={styles.track} style={{ transform: `translateX(-${(step - 1) * 100}%)` }}>
          <section className={styles.panel} aria-label="Итог расчета">
            <div className={styles.panelBody}>
              <div className={styles.heroValue}>
                <span className={styles.heroLabel}>Ежемесячный платеж</span>
                <strong className={styles.heroAmount}>{formatAmount(calculation.monthlyPayment)} руб</strong>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>Итоговая сумма</span>
                  <strong>{formatAmount(calculation.summaryPayment)} руб</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Переплата в месяц</span>
                  <strong>{formatAmount(calculation.monthlyAdditionalPayment)} руб</strong>
                </div>
              </div>

              <div className={styles.selectionList}>
                <div>
                  <span>Стоимость товара</span>
                  <strong>{formatAmount(calculation.cost)} руб</strong>
                </div>
                <div>
                  <span>Первый взнос</span>
                  <strong>{formatAmount(calculation.firstPayment)} руб</strong>
                </div>
                <div>
                  <span>Срок</span>
                  <strong>{calculation.period} мес.</strong>
                </div>
                <div className={styles.selectionListLastItem}>
                  <span>Поручителей по условиям</span>
                  <strong>{calculation.guarantorsCount}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-label="Контактные данные">
            <div className={styles.panelBody}>
              <PersonalDetailsStep
                details={details}
                minDate={minDate}
                maxDate={maxDate}
                rangeLabel={rangeLabel}
                productPhoto={uploads.productPhoto}
                error={stepError}
                onChange={handleDetailsChange}
                onProductPhotoSelect={(file) => updateUpload("productPhoto", file)}
                onProductPhotoClear={() => clearUpload("productPhoto")}
              />
            </div>
          </section>

          <section className={styles.panel} aria-label="Документы покупателя">
            <div className={styles.panelBody}>
              <BuyerDocumentsStep
                buyerPassportMain={uploads.buyerPassportMain}
                buyerPassportResidence={uploads.buyerPassportResidence}
                buyerSelfie={uploads.buyerSelfie}
                error={stepError}
                onBuyerPassportMainSelect={(file) => updateUpload("buyerPassportMain", file)}
                onBuyerPassportResidenceSelect={(file) => updateUpload("buyerPassportResidence", file)}
                onBuyerSelfieSelect={(file) => updateUpload("buyerSelfie", file)}
                onBuyerPassportMainClear={() => clearUpload("buyerPassportMain")}
                onBuyerPassportResidenceClear={() => clearUpload("buyerPassportResidence")}
                onBuyerSelfieClear={() => clearUpload("buyerSelfie")}
              />
            </div>
          </section>

          <section className={styles.panel} aria-label="Документы поручителей">
            <div className={styles.panelBody}>
              <GuarantorDocumentsStep
                guarantorsCount={calculation.guarantorsCount}
                guarantor1={{
                  passportMain: uploads.guarantor1PassportMain,
                  passportResidence: uploads.guarantor1PassportResidence,
                  phone: guarantorPhones.guarantor1,
                }}
                guarantor2={{
                  passportMain: uploads.guarantor2PassportMain,
                  passportResidence: uploads.guarantor2PassportResidence,
                  phone: guarantorPhones.guarantor2,
                }}
                error={stepError}
                submitting={submitting}
                submitError={submitError}
                onSelect={(field, file) => updateUpload(field as keyof UploadState, file)}
                onClear={(field) => clearUpload(field as keyof UploadState)}
                onPhoneChange={(key, rawPhone) =>
                  setGuarantorPhones((prev) => ({ ...prev, [key]: formatPhoneNumber(rawPhone) }))
                }
              />
            </div>
          </section>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.helper}>Ваши данные защищены и используются только для оформления заявки</span>

        <div className={styles.footerActions}>
          {step === 1 ? (
            <button type="button" className={styles.secondaryButton} onClick={onContacts}>
              К контактам
            </button>
          ) : (
            <button type="button" className={styles.secondaryButton} onClick={handleBack}>
              Назад
            </button>
          )}

          {step < 4 ? (
            <button type="button" className={styles.primaryButton} onClick={handleNext}>
              {step === 1 ? "Продолжить оформление" : "Дальше"}
            </button>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Отправляем..." : "Отправить заявку"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
