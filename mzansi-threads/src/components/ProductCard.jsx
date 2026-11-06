import { useState } from 'react';
import { formatZAR } from '../currency.js';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProductCard({ product, onAdd }) {
  const isOneSize = product.category === 'Accessories';
  const [size, setSize] = useState(isOneSize ? 'One size' : 'M');
  const [c1, c2] = product.colors;

  return (
    <article className="card">
      <div className="card-img" style={{ background: `repeating-linear-gradient(45deg, ${c1} 0 14px, ${c2} 14px 28px)` }}>
        <span className="card-emoji">{product.emoji}</span>
        {product.tag && <span className="card-tag">{product.tag}</span>}
      </div>
      <div className="card-body">
        <p className="card-cat">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="card-desc">{product.description}</p>
        <div className="card-footer">
          <span className="price">{formatZAR(product.price)}</span>
          {!isOneSize && (
            <select value={size} onChange={(e) => setSize(e.target.value)} aria-label="Size">
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
        <button className="btn btn-green full" onClick={() => onAdd(product, size)}>Add to trolley</button>
      </div>
    </article>
  );
}
