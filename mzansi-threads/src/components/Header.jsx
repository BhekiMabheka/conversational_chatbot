export default function Header({ itemCount, onCartClick }) {
  return (
    <>
      <div className="announcement">🚚 Free delivery nationwide on orders over R1 000 · Proudly South African 🇿🇦</div>
      <header className="header">
        <div className="container header-inner">
          <a href="#" className="logo">Mzansi<span>Threads</span></a>
          <nav className="nav">
            <a href="#shop">Shop</a>
            <a href="#about">About</a>
            <button className="cart-btn" onClick={onCartClick} aria-label="Open trolley">
              🛒 Trolley {itemCount > 0 && <span className="badge">{itemCount}</span>}
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
