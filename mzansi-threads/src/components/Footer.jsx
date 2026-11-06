export default function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="flag-stripe" aria-hidden="true" />
      <div className="container footer-inner">
        <div>
          <h4>Mzansi Threads</h4>
          <p>Designed and made in South Africa, supporting local makers from Soweto to Stellenbosch.</p>
        </div>
        <div>
          <h4>Help</h4>
          <p>Delivery in 2–7 working days · 30-day returns · All prices in ZAR incl. 15% VAT</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>hello@mzansithreads.example · 010 123 4567</p>
        </div>
      </div>
      <p className="copyright">© {new Date().getFullYear()} Mzansi Threads. Local is lekker. 🇿🇦</p>
    </footer>
  );
}
