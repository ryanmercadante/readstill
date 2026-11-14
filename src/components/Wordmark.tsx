import { Link } from '@tanstack/react-router';

export function Wordmark() {
  return (
    <Link className="wordmark" to="/" aria-label="Still home">
      <span className="brand-mark" aria-hidden="true"><i /><i /></span>
      still<span className="brand-period">.</span>
    </Link>
  );
}
