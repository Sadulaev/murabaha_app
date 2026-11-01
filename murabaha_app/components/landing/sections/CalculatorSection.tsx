"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApplicationFlow } from "@/components/application/ApplicationFlow";
import { AnimatedText } from "../AnimatedText";
import {
  MAX_COST,
  MIN_COST,
  PERIOD_OPTIONS,
  calculateInstallment,
  costToSlider,
  getMaxPeriod,
  roundToNearestHundred,
  sliderToCost,
  snapPeriod,
} from "@/lib/calculator";
import { getGuarantorsCount } from "@/lib/application-flow";
import styles from "./CalculatorSection.module.css";

type CalculatorSectionProps = {
  active: boolean;
  onNext: () => void;
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

export function CalculatorSection({ active, onNext }: CalculatorSectionProps) {
  const searchParams = useSearchParams();
  const encryptedRate = searchParams.get("k") ?? "";

  const [cost, setCost] = useState(120000);
  const [firstPayment, setFirstPayment] = useState(30000);
  const [period, setPeriod] = useState(6);
  const [flowStep, setFlowStep] = useState(1);

  const maxPeriod = getMaxPeriod(cost, firstPayment);

  const result = useMemo(
    () => calculateInstallment({ cost, firstPayment, period, encryptedRate }),
    [cost, encryptedRate, firstPayment, period],
  );

  const guarantorsCount = getGuarantorsCount(cost);
  const expandedFlow = flowStep > 1;

  const handleCostChange = (nextCost: number) => {
    if (!Number.isFinite(nextCost)) {
      return;
    }

    const sanitizedCost = clamp(Math.round(nextCost), 0, MAX_COST);
    setCost(sanitizedCost);

    const newFirstPayment =
      firstPayment > sanitizedCost * 0.8
        ? roundToNearestHundred(sanitizedCost * 0.8)
        : firstPayment;
    if (newFirstPayment !== firstPayment) setFirstPayment(newFirstPayment);

    const newMax = getMaxPeriod(sanitizedCost, newFirstPayment);
    if (period > newMax) setPeriod(snapPeriod(period, newMax));
  };

  const handleFirstPaymentChange = (nextPayment: number) => {
    if (!Number.isFinite(nextPayment) || cost <= 0) {
      return;
    }

    const cappedPayment = clamp(Math.round(nextPayment), 0, roundToNearestHundred(cost * 0.8));
    setFirstPayment(cappedPayment);

    const newMax = getMaxPeriod(cost, cappedPayment);
    if (period > newMax) setPeriod(snapPeriod(period, newMax));
  };

  const handlePeriodChange = (nextPeriod: number) => {
    if (nextPeriod > maxPeriod || nextPeriod === period) {
      return;
    }

    setPeriod(nextPeriod);

    if (firstPayment < cost * 0.25) {
      setFirstPayment(roundToNearestHundred(cost * 0.25));
    }
  };

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
                  min={0}
                  max={Math.max(roundToNearestHundred(cost * 0.8), 0)}
                  step={Math.max(roundToNearestHundred(cost * 0.05), 100)}
                  value={Math.min(firstPayment, roundToNearestHundred(cost * 0.8))}
                  onChange={(event) => handleFirstPaymentChange(Number(event.target.value))}
                />
                <div className={styles.fieldMeta}>
                  <span>0</span>
                  <span>{formatAmount(roundToNearestHundred(cost * 0.8))}</span>
                </div>
              </label>

              <div className={styles.field} role="radiogroup" aria-labelledby="period-label">
                <span id="period-label" className={styles.fieldLabel}>
                  Срок рассрочки
                </span>
                <div className={styles.periodGroup}>
                  {PERIOD_OPTIONS.map((option) => {
                    const disabled = option > maxPeriod;
                    const selected = option === period;
                    return (
                      <label
                        key={option}
                        className={[
                          styles.periodOption,
                          selected ? styles.periodOptionActive : "",
                          disabled ? styles.periodOptionDisabled : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="radio"
                          name="period"
                          className="srOnly"
                          value={option}
                          checked={selected}
                          disabled={disabled}
                          onChange={() => handlePeriodChange(option)}
                        />
                        <span className={styles.periodValue}>{option}</span>
                        <span className={styles.periodUnit}>{formatMonths(option)}</span>
                      </label>
                    );
                  })}
                </div>
                {maxPeriod < PERIOD_OPTIONS[PERIOD_OPTIONS.length - 1] && (
                  <span className={styles.periodHint}>
                    {cost < 50000
                      ? "При стоимости до 50 000 руб доступно до 6 месяцев."
                      : "Без первоначального взноса доступно до 6 месяцев."}
                  </span>
                )}
              </div>
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
