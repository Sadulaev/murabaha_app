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
    title: "До 100 000 руб",
    text: "Если сумма до 100 000 руб, нужен один поручитель.",
  },
  {
    title: "100 000 – 300 000 руб",
    text: "Если сумма от 100 000 до 300 000 руб, нужны два поручителя.",
  },
];

const advantages = [
  "По нормам Ислама",
  "Без штрафов и пеней",
  "Дата платежа на выбор",
  "Наличный и безналичный расчет",
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
            Рассрочка, где правила видны сразу.
          </AnimatedText>

          <AnimatedText as="p" active={active} delay={160} className={styles.description}>
            От 10 000 до 300 000 руб. Без банка, без лишних экранов и с понятными рамками с первого
            касания.
          </AnimatedText>

          <AnimatedText as="div" active={active} delay={220} className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>10 000 – 300 000</span>
              <span className={styles.metricLabel}>сумма товара</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>1 – 12 мес.</span>
              <span className={styles.metricLabel}>срок рассрочки</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>0 – 80%</span>
              <span className={styles.metricLabel}>первый взнос</span>
            </div>
          </AnimatedText>

          <AnimatedText as="button" active={active} delay={280} className={styles.primaryButton} onClick={onNext}>
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
                <span className={styles.cardIndex}>0{index + 1}</span>
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardText}>{item.text}</p>
              </AnimatedText>
            ))}
          </div>

          <AnimatedText as="div" active={active} delay={360} className={styles.advantageStrip}>
            {advantages.map((item) => (
              <span key={item} className={styles.advantageChip}>
                {item}
              </span>
            ))}
          </AnimatedText>
        </div>
      </div>
    </div>
  );
}
