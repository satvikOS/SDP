import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="SDP home">
      <svg className="brand-symbol" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M2 31 7.2 18h7L9 31H2Z" />
        <path d="m11.2 31 8.6-22h7L18.2 31h-7Z" />
        <path d="M21 31 32.2 2h-7L14 31h7Z" />
      </svg>
      {!compact && (
        <span className="brand-type">
          <strong><span>S</span>DP</strong>
          <small>Scenario development</small>
        </span>
      )}
    </Link>
  );
}
