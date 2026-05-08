import { AnimatedText } from "../AnimatedText";
import styles from "./ConditionsSection.module.css";

type ConditionsSectionProps = {
  active: boolean;
  onNext: () => void;
};

const requirements = [
  {
    title: "Возраст от 21 года",
    text: "Покупатель и поручитель должны быть старше 21 года.",
  },
  {
    title: "Прописка по ЧР",
    text: "Обязательная прописка в Чеченской Республике.",
  },
  {
    title: "Один поручитель",
    text: "Если сумма до 100 000 руб, нужен один поручитель.",
  },
  {
    title: "Два поручителя",
    text: "Если сумма от 100 000 до 300 000 руб, нужны два поручителя.",
  },
];

const advantages = [
  "Онлайн оформление",
  "Наличный и безналичный расчет",
  "Без штрафов и пеней",
  "Гибкий график платежей",
];

export function ConditionsSection({ active, onNext }: ConditionsSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.copyColumn}>
          <AnimatedText as="span" active={active} delay={0} className={styles.eyebrow}>
            Условия
          </AnimatedText>

          <AnimatedText as="h1" active={active} delay={80} className={styles.title}>
            Рассрочка по нормам Ислама
          </AnimatedText>

          <AnimatedText as="div" active={active} delay={360} className={styles.advantageStrip}>
            {advantages.map((item) => (
              <span key={item} className={styles.advantageChip}>
                {item}
              </span>
            ))}
          </AnimatedText>

          <AnimatedText as="div" active={active} delay={220} className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>10 000 – 300 000</span>
              <span className={styles.metricLabel}>сумма товара</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>3 – 12 мес.</span>
              <span className={styles.metricLabel}>срок рассрочки</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>0 – 20%</span>
              <span className={styles.metricLabel}>первый взнос</span>
            </div>
          </AnimatedText>

          <AnimatedText as="button" active={active} delay={280} className={`${styles.primaryButton} ${styles.desktopButton}`} onClick={onNext}>
            Перейти к калькулятору
          </AnimatedText>
        </div>

        <div className={styles.cardsColumn}>
          <div className={styles.cardsGrid}>
            {requirements.map((item, index) => (
              <AnimatedText
                key={item.title}
                as="article"
                active={active}
                delay={120 + index * 70}
                className={styles.card}
              >
                <span className={styles.cardIndex}>{index + 1}</span>
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardText}>{item.text}</p>
              </AnimatedText>
            ))}
          </div>

          <AnimatedText as="button" active={active} delay={280} className={`${styles.primaryButton} ${styles.mobileButton}`} onClick={onNext}>
            Перейти к калькулятору
          </AnimatedText>
        </div>
      </div>
    </div>
  );
}
