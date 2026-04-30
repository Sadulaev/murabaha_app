import type { PersonalDetails } from "@/lib/application-flow";
import styles from "./ApplicationFlow.module.css";

type PersonalDetailsStepProps = {
  details: PersonalDetails;
  rangeLabel: string;
  minDate: string;
  maxDate: string;
  error: string | null;
  onChange: (patch: Partial<PersonalDetails>) => void;
};

export function PersonalDetailsStep({
  details,
  rangeLabel,
  minDate,
  maxDate,
  error,
  onChange,
}: PersonalDetailsStepProps) {
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

      {error ? <span className={styles.error}>{error}</span> : null}
    </>
  );
}
