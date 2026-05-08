export type CalculationSummary = {
  cost: number;
  firstPayment: number;
  period: number;
  monthlyPayment: number;
  monthlyAdditionalPayment: number;
  summaryPayment: number;
  guarantorsCount: number;
};

export type PersonalDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  firstPaymentDate: string;
  storeName: string;
};

export type UploadValue = {
  file: File;
  previewUrl: string;
};

export function getGuarantorsCount(cost: number) {
  return cost <= 100000 ? 1 : 2;
}

export function formatPhoneNumber(value: string) {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";

  const normalized = cleaned.startsWith("7") ? cleaned : `7${cleaned.slice(0, 10)}`;
  if (normalized.length <= 1) return "+7 (";
  if (normalized.length <= 4) return `+7 (${normalized.slice(1)}`;
  if (normalized.length <= 7) return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) {
    return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  }

  return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
}

export function isValidPhone(value: string) {
  return value.replace(/\D/g, "").length === 11;
}

export function getNextMonthDateRange() {
  const today = new Date();
  const targetPrevDays = today.getDate() - 15;
  const from = new Date(today.getFullYear(), today.getMonth() + 1, targetPrevDays);
  const targetDay = today.getDate() + 7;
  const to = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);

  return { from, to };
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDefaultFirstPaymentDate() {
  return toDateInputValue(getNextMonthDateRange().from);
}

export async function createUploadValue(file: File): Promise<UploadValue> {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokeUploadValue(value: UploadValue | null) {
  if (value?.previewUrl) {
    URL.revokeObjectURL(value.previewUrl);
  }
}
