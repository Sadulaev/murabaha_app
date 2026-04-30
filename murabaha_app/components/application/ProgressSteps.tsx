import styles from "./ApplicationFlow.module.css";

const steps = [
  { step: 1, title: "Расчет" },
  { step: 2, title: "Данные" },
  { step: 3, title: "Покупатель" },
  { step: 4, title: "Поручитель" },
];

type ProgressStepsProps = {
  currentStep: number;
};

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  return (
    <div className={styles.progress}>
      {steps.map((item) => {
        const active = item.step === currentStep;

        return (
          <div
            key={item.step}
            className={active ? `${styles.progressItem} ${styles.progressItemActive}` : styles.progressItem}
          >
            <span className={styles.progressIndex}>0{item.step}</span>
            <div className={styles.progressLabel}>
              <strong>{item.title}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}
