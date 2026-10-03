import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="page-frame">
      <section className="empty-library panel">
        <span className="section-kicker">Not found</span>
        <h2>This route is outside the scenario field.</h2>
        <p>The page may have moved during the Vercel migration.</p>
        <Link className="button button-secondary" href="/"><ArrowLeft size={16} /> Return to briefing</Link>
      </section>
    </div>
  );
}
