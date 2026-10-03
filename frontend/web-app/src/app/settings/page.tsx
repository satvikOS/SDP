import { permanentRedirect } from 'next/navigation';

export default function LegacySettingsPage() {
  permanentRedirect('/workspace');
}
