import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, VAT_RATE } from '../currency.js';

export function getTotals(items) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const vat = total - total / (1 + VAT_RATE); // VAT included in the price
  return { subtotal, delivery, total, vat };
}
