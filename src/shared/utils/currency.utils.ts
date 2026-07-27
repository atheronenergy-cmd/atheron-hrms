const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  amount: number,
  currency = "INR",
  locale = "en-IN",
): string {
  const key = `${locale}-${currency}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }),
    );
  }
  return currencyFormatters.get(key)!.format(amount);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCompactCurrency(amount: number, currency = "INR"): string {
  if (amount >= 1_00_00_000) return `${formatCurrency(amount / 1_00_00_000, currency).replace(/\.\d+/, "")}Cr`;
  if (amount >= 1_00_000) return `${formatCurrency(amount / 1_00_000, currency).replace(/\.\d+/, "")}L`;
  if (amount >= 1_000) return `${formatCurrency(amount / 1_000, currency).replace(/\.\d+/, "")}K`;
  return formatCurrency(amount, currency);
}
