import { Link } from 'react-router-dom';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="PatziShop, inicio">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 12h18l-2 17H9z" fill="currentColor" />
        <path d="M12 13V8a4 4 0 0 1 8 0v5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <span>
        PatziShop<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
