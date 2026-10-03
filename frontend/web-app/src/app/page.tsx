import { Brand } from '@/components/Brand';
import { WelcomeHero } from '@/components/WelcomeHero';

export default function Home() {
  return (
    <div className="public-shell">
      <header className="public-header"><Brand /><span>Strategic scenario workspace</span></header>
      <WelcomeHero />
      <footer className="public-footer"><Brand compact /><span>Scenario Development Process</span></footer>
    </div>
  );
}
