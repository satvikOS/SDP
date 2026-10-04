import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="SDP home">
      <svg className="brand-symbol" viewBox="0 0 38 34" aria-hidden="true">
        <path d="M2 30 7.2 17h6L8 30H2Z" />
        <path d="M11.2 30 19.6 9h6l-8.4 21h-6Z" />
        <path d="M20.4 30 31.6 2h6L26.4 30h-6Z" />
      </svg>
      {!compact && (
        <span className="brand-type">
          <strong>SDP</strong>
          <small>Scenario development</small>
        </span>
      )}
    </Link>
  );
}
