import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="SDP home">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="brand-type">
          <strong>SDP</strong>
          <small>Scenario development</small>
        </span>
      )}
    </Link>
  );
}
