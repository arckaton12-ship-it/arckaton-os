import { Currency } from '../types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  XAF: 'FCFA',
  EUR: '€',
  USD: '$',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  XAF: 'FCFA (CEMAC)',
  EUR: 'EUR (€)',
  USD: 'USD ($)',
};

// Official fixed parity: 1 EUR = 655.957 XAF
export const EUR_RATE = 655.957;
// Standard commercial exchange: 1 USD ≈ 600 XAF
export const USD_RATE = 600;

export function formatCurrencyPrice(
  amountXAF: number, 
  currency: Currency = 'XAF', 
  options?: { perMonth?: boolean; discountPercent?: number }
): string {
  let effectiveAmount = amountXAF;
  if (options?.discountPercent) {
    effectiveAmount = Math.round(effectiveAmount * (1 - options.discountPercent / 100));
  }

  const suffix = options?.perMonth ? '/mois' : '';

  if (currency === 'XAF') {
    return `${effectiveAmount.toLocaleString('fr-FR')} FCFA${suffix}`;
  }

  if (currency === 'EUR') {
    const inEur = Math.round(effectiveAmount / EUR_RATE);
    return `${inEur.toLocaleString('fr-FR')} €${suffix}`;
  }

  const inUsd = Math.round(effectiveAmount / USD_RATE);
  return `$${inUsd.toLocaleString('en-US')}${suffix}`;
}
