'use client';

import {
  Activity,
  BookOpen,
  CircleHelp,
  Gauge,
  Library,
  Settings,
  Telescope,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const primary = [
  { name: 'Briefing', href: '/', icon: Gauge },
  { name: 'Scenario lab', href: '/scenarios/new', icon: Telescope },
  { name: 'Library', href: '/scenarios', icon: Library },
  { name: 'Portfolio', href: '/analytics', icon: Activity },
];

const secondary = [
  { name: 'Method', href: '/help', icon: BookOpen },
  { name: 'Runtime', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-nav">
      <Link className="brand-mark" href="/" aria-label="SDP home">
        <span className="brand-glyph" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <strong>SDP</strong>
          <small>Decision room</small>
        </span>
      </Link>

      <nav className="nav-group" aria-label="Primary navigation">
        {primary.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : item.href === '/scenarios/new'
              ? pathname === '/scenarios/new'
              : item.href === '/scenarios'
                ? pathname.startsWith('/scenarios') && pathname !== '/scenarios/new'
                : pathname.startsWith(item.href);
          return (
            <Link className="nav-item" data-active={active} href={item.href} key={item.href}>
              <item.icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <nav className="nav-group nav-group-secondary" aria-label="Support navigation">
        {secondary.map((item) => (
          <Link
            className="nav-item"
            data-active={pathname.startsWith(item.href)}
            href={item.href}
            key={item.href}
          >
            <item.icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="nav-footer">
        <CircleHelp aria-hidden="true" size={16} />
        <span>Four futures. One better decision.</span>
      </div>
    </aside>
  );
}
