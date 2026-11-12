"use client";

import { type CSSProperties, type FocusEvent, useEffect, useMemo, useState } from "react";
import {
  FALLBACK_CATEGORY,
  getCategorySpotlight,
  type CalculatorCategory,
  type CategorySpotlight,
} from "@/lib/calculator";
import { AnimatedText } from "../AnimatedText";
import styles from "./ConditionsSection.module.css";

/** How long each category stays on the first block before the next one. */
export const CATEGORY_ROTATION_MS = 5000;

const METRICS: Array<{ key: keyof Pick<CategorySpotlight, "amountLabel" | "termLabel" | "downPaymentLabel">; label: string }> = [
  { key: "amountLabel", label: "сумма товара" },
  { key: "termLabel", label: "срок рассрочки" },
  { key: "downPaymentLabel", label: "первый взнос" },
];

type ConditionsSectionProps = {
  active: boolean;
  onNext: () => void;
  categories: CalculatorCategory[];
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
  "Онлайн расчёт рассрочки",
  "Наличный и безналичный расчет",
  "Без штрафов и пеней",
  "Гибкий график платежей",
];

export function ConditionsSection({ active, onNext, categories }: ConditionsSectionProps) {
  const rotationKey = categories.map((category) => category.id).join("|");
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  const spotlights = useMemo(
    () => (categories.length > 0 ? categories : [FALLBACK_CATEGORY]).map(getCategorySpotlight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rotationKey, categories],
  );
  const rotating = spotlights.length > 1;
  const paused = hovered || focused || pageHidden || !active;

  useEffect(() => {
    setIndex(0);
  }, [rotationKey]);

  useEffect(() => {
    const sync = () => setPageHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // setTimeout per step: after a pause the current category gets a full interval again.
  useEffect(() => {
    if (!rotating || paused) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % spotlights.length);
    }, CATEGORY_ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, paused, index, spotlights.length]);

  const safeIndex = index % spotlights.length;
  const spotlight = spotlights[safeIndex];

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <div className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.copyColumn}>

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

          {rotating ? (
            <AnimatedText
              as="div"
              active={active}
              delay={220}
              className={styles.spotlight}
              data-paused={paused ? "true" : "false"}
              style={{ "--rotation-ms": `${CATEGORY_ROTATION_MS}ms` } as CSSProperties}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={handleBlur}
            >
              <div className={styles.spotlightHeader}>
                <span className={styles.spotlightCaption}>Условия для категории</span>
                <span className={`${styles.spotlightName} ${styles.swapStack}`}>
                  {spotlights.map((item, itemIndex) => (
                    <span
                      key={item.id}
                      className={styles.swapItem}
                      data-current={itemIndex === safeIndex ? "true" : "false"}
                      aria-hidden={itemIndex !== safeIndex}
                    >
                      {item.name}
                    </span>
                  ))}
                </span>
                <span className={styles.spotlightDots} role="group" aria-label="Выбор категории">
                  {spotlights.map((item, itemIndex) => (
                    <button
                      key={`${item.id}-${itemIndex === safeIndex ? index : "idle"}`}
                      type="button"
                      className={styles.spotlightDot}
                      data-current={itemIndex === safeIndex ? "true" : "false"}
                      aria-label={item.name}
                      aria-pressed={itemIndex === safeIndex}
                      onClick={() => setIndex(itemIndex)}
                    />
                  ))}
                </span>
              </div>

              <div
                className={styles.metrics}
                data-category-id={spotlight.id}
                data-category-name={spotlight.name}
                aria-live={paused ? "polite" : "off"}
                aria-label={spotlight.name}
              >
                {METRICS.map((metric) => (
                  <div key={metric.key} className={styles.metricCard}>
                    <span className={`${styles.metricValue} ${styles.swapStack}`}>
                      {spotlights.map((item, itemIndex) => (
                        <span
                          key={item.id}
                          className={styles.swapItem}
                          data-current={itemIndex === safeIndex ? "true" : "false"}
                          aria-hidden={itemIndex !== safeIndex}
                        >
                          {item[metric.key]}
                        </span>
                      ))}
                    </span>
                    <span className={styles.metricLabel}>{metric.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedText>
          ) : (
            <AnimatedText
              as="div"
              active={active}
              delay={220}
              className={styles.metrics}
              data-category-id={spotlight.id}
              data-category-name={spotlight.name}
            >
              {METRICS.map((metric) => (
                <div key={metric.key} className={styles.metricCard}>
                  <span className={styles.metricValue}>{spotlight[metric.key]}</span>
                  <span className={styles.metricLabel}>{metric.label}</span>
                </div>
              ))}
            </AnimatedText>
          )}

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
