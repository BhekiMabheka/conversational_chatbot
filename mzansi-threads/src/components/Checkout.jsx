import { useState } from 'react';
import { formatZAR } from '../currency.js';
import { provinces } from '../products.js';
import { getTotals } from './totals.js';

export default function Checkout({ items, onClose, onComplete }) {
  const { total } = getTotals(items);
  const [orderNo, setOrderNo] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', province: 'Gauteng', postal: '', payment: 'card',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!/^(\+27|0)[6-8]\d{8}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid SA cell number, e.g. 082 123 4567';
    if (!form.address.trim()) e.address = 'Please enter your street address';
    if (!form.city.trim()) e.city = 'Please enter your city or town';
    if (!/^\d{4}$/.test(form.postal)) e.postal = 'SA postal codes have 4 digits';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setOrderNo(`MZ${Math.floor(100000 + Math.random() * 900000)}`);
    onComplete();
  };

  const field = (name, label, props = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[name]} onChange={set(name)} {...props} />
      {errors[name] && <small className="error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">✕</button>
        {orderNo ? (
          <div className="success">
            <div className="success-icon">🎉</div>
            <h2>Ayoba! Order placed.</h2>
            <p>Thanks, {form.name.split(' ')[0]}! Your order <strong>#{orderNo}</strong> is on its way to {form.city}, {form.province}.</p>
            <p>We'll send updates to {form.email}. Sharp sharp! 🇿🇦</p>
            <button className="btn btn-green" onClick={onClose}>Continue shopping</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2>Checkout</h2>
            <p className="muted">Order total: <strong>{formatZAR(total)}</strong> (VAT incl.)</p>
            <div className="form-grid">
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {field('phone', 'Cell number', { type: 'tel', placeholder: '082 123 4567' })}
              {field('address', 'Street address', { autoComplete: 'street-address' })}
              {field('city', 'City / Town')}
              <label className="field">
                <span>Province</span>
                <select value={form.province} onChange={set('province')}>
                  {provinces.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              {field('postal', 'Postal code', { inputMode: 'numeric', maxLength: 4, placeholder: '2000' })}
              <label className="field">
                <span>Payment method</span>
                <select value={form.payment} onChange={set('payment')}>
                  <option value="card">Credit / Debit card</option>
                  <option value="eft">Instant EFT</option>
                  <option value="cod">Cash on delivery</option>
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-gold full">Pay {formatZAR(total)}</button>
          </form>
        )}
      </div>
    </div>
  );
}
