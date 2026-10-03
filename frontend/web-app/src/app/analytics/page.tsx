import { permanentRedirect } from 'next/navigation';

export default function LegacyAnalyticsPage() {
  permanentRedirect('/workspace/portfolio');
}
