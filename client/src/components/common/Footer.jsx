import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong>Ustachi</strong> — professional repair marketplace
        </div>
        <nav className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/masters">Masters</Link>
        </nav>
        <div className="footer-copy">© {new Date().getFullYear()} Ustachi</div>
      </div>
    </footer>
  );
}
