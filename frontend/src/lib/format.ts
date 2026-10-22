const currency = import.meta.env.VITE_CURRENCY ?? "INR";
// en-IN groups digits the Indian way (1,00,000) and abbreviates as L / Cr.
const locale = currency === "INR" ? "en-IN" : undefined;

const moneyFmt = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
const compactFmt = new Intl.NumberFormat(locale, {
  style: "currency",
  currency,
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const money = (n: number) => moneyFmt.format(n);
export const compactMoney = (n: number) => compactFmt.format(n);

/** Signed amount, e.g. "+₹1,200.00" or "−₹45.10". */
export const signedMoney = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + moneyFmt.format(Math.abs(n));

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const percent = (n: number) => `${Math.round(n * 100)}%`;

export const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" }),
);
