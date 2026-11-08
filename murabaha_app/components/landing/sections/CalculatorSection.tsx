"use client";

import { useMemo, useState } from "react";
import { ApplicationFlow } from "@/components/application/ApplicationFlow";
import { AnimatedText } from "../AnimatedText";
import {
  FALLBACK_CATEGORY_ID,
  MAX_COST,
  MIN_COST,
  calculateInstallment,
  costToSlider,
  getMaxFirstPayment,
  getMinFirstPayment,
  roundToNearestHundred,
  sliderToCost,
  snapToTerm,
} from "@/lib/calculator";
import { getGuarantorsCount } from "@/lib/application-flow";
import { useCalculatorConfig } from "@/hooks/useCalculatorConfig";
import styles from "./CalculatorSection.module.css";

type CalculatorSectionProps = {
  active: boolean;
  onNext: () => void;
  partnerId: string | null;
  partnerReady: boolean;
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

export function CalculatorSection({ active, onNext, partnerId, partnerReady }: CalculatorSectionProps) {
  const { categories } = useCalculatorConfig(partnerId, partnerReady);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cost, setCost] = useState(120000);
  // What the user asked for; the effective value is clamped to the selected term's limits.
  const [desiredFirstPayment, setDesiredFirstPayment] = useState(30000);
  const [desiredPeriod, setDesiredPeriod] = useState(6);
  const [flowStep, setFlowStep] = useState(1);

  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const terms = category.terms;
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
  const expandedFlow = flowStep > 1;
  const isRealCategory = category.id !== FALLBACK_CATEGORY_ID;

  const handleCostChange = (nextCost: number) => {
    if (!Number.isFinite(nextCost)) return;
    setCost(clamp(Math.round(nextCost), 0, MAX_COST));
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
        <div className={expandedFlow ? `${styles.shell} ${styles.shellExpanded}` : styles.shell}>
          <div className={styles.formColumn} aria-hidden={expandedFlow}>
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
                  />
                  <span>руб</span>
                </div>
                <input
                  className={styles.range}
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={costToSlider(Math.max(cost, MIN_COST))}
                  onChange={(event) => handleCostChange(sliderToCost(Number(event.target.value)))}
                />
                <div className={styles.fieldMeta}>
                  <span>10 000</span>
                  <span>150 000</span>
                  <span>300 000</span>
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

          <div className={expandedFlow ? `${styles.resultColumn} ${styles.resultColumnExpanded}` : styles.resultColumn}>
            <AnimatedText
              as="div"
              active={active}
              delay={260}
              className={expandedFlow ? `${styles.resultCard} ${styles.resultCardExpanded}` : styles.resultCard}
            >
              <ApplicationFlow
                calculation={{
                  cost,
                  firstPayment,
                  period,
                  monthlyPayment: result.monthlyPayment,
                  monthlyAdditionalPayment: result.monthlyAdditionalPayment,
                  summaryPayment: result.summaryPayment,
                  guarantorsCount,
                  categoryId: isRealCategory ? category.id : undefined,
                  categoryName: isRealCategory ? category.name : undefined,
                }}
                onContacts={onNext}
                onStepChange={setFlowStep}
                expanded={expandedFlow}
              />
            </AnimatedText>
          </div>
        </div>
      </div>
    </>
  );
}
