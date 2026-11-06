import { formatZAR, FREE_DELIVERY_THRESHOLD } from '../currency.js';
import { getTotals } from './totals.js';

export default function Cart({ open, items, onClose, onQty, onCheckout }) {
  const { subtotal, delivery, total, vat } = getTotals(items);
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Your trolley</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {items.length === 0 ? (
          <p className="empty">Your trolley is empty. Go on, treat yourself! 😄</p>
        ) : (
          <>
            {remaining > 0 && (
              <p className="notice">Add {formatZAR(remaining)} more for <strong>free delivery</strong>.</p>
            )}
            <ul className="cart-list">
              {items.map((i) => (
                <li key={i.key} className="cart-item">
                  <span className="cart-emoji">{i.emoji}</span>
                  <div className="cart-info">
                    <strong>{i.name}</strong>
                    <small>Size: {i.size}</small>
                    <span>{formatZAR(i.price * i.qty)}</span>
                  </div>
                  <div className="qty">
                    <button onClick={() => onQty(i.key, -1)} aria-label="Decrease">−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => onQty(i.key, 1)} aria-label="Increase">+</button>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="summary">
              <div><dt>Subtotal</dt><dd>{formatZAR(subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{delivery ? formatZAR(delivery) : 'FREE'}</dd></div>
              <div className="total"><dt>Total</dt><dd>{formatZAR(total)}</dd></div>
              <div className="vat"><dt>Incl. 15% VAT</dt><dd>{formatZAR(vat)}</dd></div>
            </dl>
            <button className="btn btn-gold full" onClick={onCheckout}>Checkout</button>
          </>
        )}
      </aside>
    </>
  );
}
