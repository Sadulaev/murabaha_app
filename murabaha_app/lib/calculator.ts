export const MIN_COST = 10000;
export const MAX_COST = 300000;
export const MAX_PERIOD = 12;

export type CalculationResult = {
  monthlyPayment: number;
  summaryPayment: number;
  monthlyAdditionalPayment: number;
  baseRate: number;
};

export function roundToNearestHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

export function roundToLowerHundred(value: number): number {
  return Math.floor(value / 100) * 100;
}

export function decryptNumber(encrypted: string): number {
  try {
    if (!encrypted.startsWith("f") || !encrypted.endsWith("t")) {
      return 5;
    }

    const middle = encrypted.slice(1, -1);
    const multiplied = parseInt(middle, 36) - 1000;
    const number = multiplied / 1000;

    return Number.isNaN(number) ? 5 : number;
  } catch {
    return 5;
  }
}

export function sliderToCost(position: number): number {
  if (position <= 50) {
    const raw = MIN_COST + (position / 50) * 140000;
    return Math.round(raw / 500) * 500;
  }

  const raw = 150000 + ((position - 50) / 50) * 150000;
  return Math.round(raw / 5000) * 5000;
}

export function costToSlider(value: number): number {
  if (value <= 150000) {
    return ((value - MIN_COST) / 140000) * 50;
  }

  return 50 + ((value - 150000) / 150000) * 50;
}

export function calculateInstallment({
  cost,
  firstPayment,
  period,
  encryptedRate,
}: {
  cost: number;
  firstPayment: number;
  period: number;
  encryptedRate: string;
}): CalculationResult {
  if (cost <= 0 || period <= 0) {
    return {
      monthlyPayment: 0,
      summaryPayment: 0,
      monthlyAdditionalPayment: 0,
      baseRate: decryptNumber(encryptedRate),
    };
  }

  const percentsCountsSum = firstPayment >= cost / 2 ? cost - firstPayment : cost;
  const baseRate = decryptNumber(encryptedRate);
  const additionalPercent = firstPayment >= cost * 0.25 ? 0 : baseRate / period;
  const percent = baseRate + additionalPercent;

  const percentsCountedSum = percentsCountsSum * (percent / 100) * period;

  // Round monthly DOWN so rounding loss is always on our side, never the user's
  const monthlyPayment = roundToLowerHundred((cost + percentsCountedSum - firstPayment) / period);
  // Derive summary from actual payments to keep numbers consistent
  const summaryPayment = firstPayment + monthlyPayment * period;

  return {
    monthlyPayment,
    summaryPayment,
    monthlyAdditionalPayment: roundToLowerHundred(percentsCountedSum / period),
    baseRate,
  };
}
