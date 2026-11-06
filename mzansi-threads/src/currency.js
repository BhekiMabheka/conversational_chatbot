// Formats a number as South African Rand, e.g. R 1 299,00
const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
export const formatZAR = (amount) => zar.format(amount);

export const VAT_RATE = 0.15; // SA VAT – prices shown are VAT inclusive
export const FREE_DELIVERY_THRESHOLD = 1000;
export const DELIVERY_FEE = 99;
