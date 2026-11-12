"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedText } from "../AnimatedText";
import {
  calculateInstallment,
  costScaleMidpoint,
  costToSlider,
  getGuarantorsCount,
  getMaxFirstPayment,
  getMinFirstPayment,
  roundToNearestHundred,
  sliderToCost,
  snapToTerm,
  FALLBACK_CATEGORY,
  type CalculatorCategory,
} from "@/lib/calculator";
import styles from "./CalculatorSection.module.css";

type CalculatorSectionProps = {
  active: boolean;
  onNext: () => void;
  categories: CalculatorCategory[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMonths(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "месяц";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "месяца";
  return "месяцев";
}

function parseDigits(value: string) {
  const numeric = Number(value.replace(/\D/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function formatPercent(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
}

export function CalculatorSection({ active, onNext, categories }: CalculatorSectionProps) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cost, setCost] = useState(120000);
  // What the user asked for; the effective value is clamped to the selected term's limits.
  const [desiredFirstPayment, setDesiredFirstPayment] = useState(30000);
  const [desiredPeriod, setDesiredPeriod] = useState(6);

  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? FALLBACK_CATEGORY;
  const terms = category.terms.length > 0 ? category.terms : FALLBACK_CATEGORY.terms;
  const amountMin = category.amountMin;
  const amountMax = category.amountMax;
  const term = snapToTerm(terms, desiredPeriod);
  const termIndex = terms.indexOf(term);
  const period = term.months;

  const minFirstPayment = getMinFirstPayment(cost, term.minDownPaymentPercent);
  const maxFirstPayment = getMaxFirstPayment(cost, minFirstPayment);
  const firstPayment = clamp(desiredFirstPayment, minFirstPayment, maxFirstPayment);

  const result = useMemo(
    () =>
      calculateInstallment({
        cost,
        firstPayment,
        period,
        markupPercent: term.markupPercent,
        includeFirstPaymentInMarkup: category.includeFirstPaymentInMarkup,
      }),
    [category.includeFirstPaymentInMarkup, cost, firstPayment, period, term.markupPercent],
  );

  const guarantorsCount = getGuarantorsCount(cost);

  useEffect(() => {
    setCost((current) => clamp(current, amountMin, amountMax));
  }, [amountMin, amountMax]);

  const handleCostChange = (nextCost: number) => {
    if (!Number.isFinite(nextCost)) return;
    setCost(clamp(Math.round(nextCost), 0, amountMax));
  };

  const handleFirstPaymentChange = (nextPayment: number) => {
    if (!Number.isFinite(nextPayment) || cost <= 0) return;
    setDesiredFirstPayment(clamp(Math.round(nextPayment), 0, maxFirstPayment));
  };

  const handleTermIndexChange = (index: number) => {
    const next = terms[clamp(index, 0, terms.length - 1)];
    if (next) setDesiredPeriod(next.months);
  };

  const firstPaymentStep = Math.max(roundToNearestHundred(cost * 0.01), 100);
  const shortestTerm = terms[0];
  const longestTerm = terms[terms.length - 1];

  return (
    <>
      <div className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.formColumn}>
            <AnimatedText as="span" active={active} delay={0} className={styles.eyebrow}>
              Калькулятор
            </AnimatedText>

            <AnimatedText as="h2" active={active} delay={80} className={styles.title}>
              Настройте рассрочку под себя
            </AnimatedText>

            <AnimatedText as="div" active={active} delay={220} className={styles.formPanel}>
              {categories.length > 1 && (
                <div className={styles.field} role="radiogroup" aria-labelledby="category-label">
                  <span id="category-label" className={styles.fieldLabel}>
                    Категория товара
                  </span>
                  <div className={styles.categoryGroup}>
                    {categories.map((item) => {
                      const selected = item.id === category.id;
                      return (
                        <label
                          key={item.id}
                          className={selected ? `${styles.categoryOption} ${styles.categoryOptionActive}` : styles.categoryOption}
                        >
                          <input
                            type="radio"
                            name="category"
                            className="srOnly"
                            value={item.id}
                            checked={selected}
                            onChange={() => setCategoryId(item.id)}
                          />
                          {item.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Стоимость товара</span>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatAmount(cost)}
                    onChange={(event) => handleCostChange(parseDigits(event.target.value))}
                    onBlur={() => setCost((current) => clamp(current, amountMin, amountMax))}
                  />
                  <span>руб</span>
                </div>
                <input
                  className={styles.range}
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={costToSlider(clamp(cost, amountMin, amountMax), amountMin, amountMax)}
                  onChange={(event) => handleCostChange(sliderToCost(Number(event.target.value), amountMin, amountMax))}
                />
                <div className={styles.fieldMeta}>
                  <span>{formatAmount(amountMin)}</span>
                  <span>{formatAmount(costScaleMidpoint(amountMin, amountMax))}</span>
                  <span>{formatAmount(amountMax)}</span>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Первоначальный взнос</span>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatAmount(firstPayment)}
                    onChange={(event) => handleFirstPaymentChange(parseDigits(event.target.value))}
                  />
                  <span>руб</span>
                </div>
                <input
                  className={styles.range}
                  type="range"
                  min={minFirstPayment}
                  max={maxFirstPayment}
                  step={firstPaymentStep}
                  value={firstPayment}
                  disabled={maxFirstPayment <= minFirstPayment}
                  onChange={(event) => handleFirstPaymentChange(Number(event.target.value))}
                />
                <div className={styles.fieldMeta}>
                  <span>{minFirstPayment > 0 ? `от ${formatAmount(minFirstPayment)}` : "0"}</span>
                  <span>{formatAmount(maxFirstPayment)}</span>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldHeader}>
                  <span className={styles.fieldLabel}>Срок рассрочки</span>
                  <span className={styles.fieldValue}>
                    {period} {formatMonths(period)}
                  </span>
                </span>
                <input
                  className={styles.range}
                  type="range"
                  min={0}
                  max={Math.max(terms.length - 1, 0)}
                  step={1}
                  value={termIndex}
                  disabled={terms.length < 2}
                  aria-valuetext={`${period} ${formatMonths(period)}`}
                  onChange={(event) => handleTermIndexChange(Number(event.target.value))}
                />
                <div className={styles.fieldMeta}>
                  <span>
                    {shortestTerm.months} {formatMonths(shortestTerm.months)}
                  </span>
                  <span>
                    {longestTerm.months} {formatMonths(longestTerm.months)}
                  </span>
                </div>
                {term.minDownPaymentPercent > 0 && (
                  <span className={styles.periodHint}>
                    На {period} {formatMonths(period)} первый взнос от {formatPercent(term.minDownPaymentPercent)} стоимости.
                  </span>
                )}
              </label>
            </AnimatedText>
          </div>

          <div className={styles.resultColumn}>
            <AnimatedText as="div" active={active} delay={260} className={styles.resultCard}>
              <div className={styles.resultBody}>
                <div className={styles.resultHeader}>
                  <span className={styles.resultLabel}>Ежемесячный платёж</span>
                  <strong className={styles.resultValue}>{formatAmount(result.monthlyPayment)} руб</strong>
                </div>

                <div className={styles.resultGrid}>
                  <div className={styles.summaryCard}>
                    <span>Итоговая сумма</span>
                    <strong>{formatAmount(result.summaryPayment)} руб</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Переплата в месяц</span>
                    <strong>{formatAmount(result.monthlyAdditionalPayment)} руб</strong>
                  </div>
                </div>

                <div className={styles.selectionList}>
                  {categories.length > 1 && (
                    <div>
                      <span>Категория</span>
                      <strong>{category.name}</strong>
                    </div>
                  )}
                  <div>
                    <span>Стоимость товара</span>
                    <strong>{formatAmount(cost)} руб</strong>
                  </div>
                  <div>
                    <span>Первый взнос</span>
                    <strong>{formatAmount(firstPayment)} руб</strong>
                  </div>
                  <div>
                    <span>Срок</span>
                    <strong>
                      {period} {formatMonths(period)}
                    </strong>
                  </div>
                  <div>
                    <span>Поручителей</span>
                    <strong>{guarantorsCount}</strong>
                  </div>
                </div>

                <p className={styles.note}>Расчёт предварительный. Точные условия уточняйте у менеджера.</p>

                <button type="button" className={styles.primaryButton} onClick={onNext}>
                  Связаться с нами
                </button>
              </div>
            </AnimatedText>
          </div>
        </div>
      </div>
    </>
  );
}
