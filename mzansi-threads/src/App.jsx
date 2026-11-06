import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import ProductCard from './components/ProductCard.jsx';
import Cart from './components/Cart.jsx';
import Checkout from './components/Checkout.jsx';
import Footer from './components/Footer.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import { categories, products } from './products.js';

export default function App() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mzansi-cart')) || []; } catch { return []; }
  });
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem('mzansi-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => products.filter((p) =>
    (category === 'All' || p.category === category) &&
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  ), [category, search]);

  const addToCart = (product, size) => {
    setCart((prev) => {
      const key = `${product.id}-${size}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { key, id: product.id, name: product.name, emoji: product.emoji, price: product.price, size, qty: 1 }];
    });
    setToast(`Sharp! ${product.name} added to your trolley 🛒`);
  };

  const updateQty = (key, delta) =>
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));

  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <Header itemCount={itemCount} onCartClick={() => setCartOpen(true)} />
      <Hero />
      <main className="container" id="shop">
        <div className="toolbar">
          <div className="chips">
            {categories.map((c) => (
              <button key={c} className={`chip ${c === category ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <input className="search" type="search" placeholder="Search the collection…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {visible.length ? (
          <div className="grid">
            {visible.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
          </div>
        ) : (
          <p className="empty">Eish, nothing matches that search. Try something else, my bru.</p>
        )}
      </main>
      <Footer />
      <Cart
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onQty={updateQty}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />
      {checkoutOpen && (
        <Checkout items={cart} onClose={() => setCheckoutOpen(false)} onComplete={() => setCart([])} />
      )}
      {toast && <div className="toast">{toast}</div>}
      <ChatWidget />
    </>
  );
}
