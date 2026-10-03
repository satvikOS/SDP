'use client';

import {
  Binoculars,
  BookOpenText,
  Files,
  FolderOpen,
  Gauge,
  GitCompareArrows,
  LayoutTemplate,
  Radar,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Brand } from './Brand';

const navigation = [
  { name: 'Overview', href: '/workspace', icon: Gauge, exact: true },
  { name: 'New scenario', href: '/workspace/new', icon: Waypoints },
  { name: 'Library', href: '/workspace/library', icon: FolderOpen },
  { name: 'Compare', href: '/workspace/compare', icon: GitCompareArrows },
  { name: 'Portfolio', href: '/workspace/portfolio', icon: Binoculars },
  { name: 'Signals', href: '/workspace/signals', icon: Radar },
  { name: 'Documents', href: '/workspace/documents', icon: Files },
  { name: 'Templates', href: '/workspace/templates', icon: LayoutTemplate },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="workspace-nav">
        <Brand />
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link data-active={active} href={item.href} key={item.href}>
                <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <Link className="method-link" data-active={pathname === '/workspace/method'} href="/workspace/method"><BookOpenText size={17} /> Method</Link>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile workspace navigation">
        {navigation.slice(0, 5).map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link data-active={active} href={item.href} key={item.href} aria-label={item.name}>
              <item.icon size={19} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
