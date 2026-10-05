'use client';

import {
  Binoculars,
  BookOpenText,
  Files,
  FolderOpen,
  Gauge,
  GitCompareArrows,
  LayoutTemplate,
  MoreHorizontal,
  Radar,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

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
  const moreNavigation = [...navigation.slice(4), { name: 'Method', href: '/workspace/method', icon: BookOpenText }];
  const moreActive = moreNavigation.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <aside className="workspace-nav">
        <Brand />
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link data-active={active} aria-current={active ? 'page' : undefined} href={item.href} key={item.href}>
                <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <Link className="method-link" data-active={pathname === '/workspace/method'} aria-current={pathname === '/workspace/method' ? 'page' : undefined} href="/workspace/method"><BookOpenText size={17} aria-hidden="true" /> Method</Link>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile workspace navigation">
        {navigation.slice(0, 4).map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link data-active={active} aria-current={active ? 'page' : undefined} href={item.href} key={item.href} aria-label={item.name}>
              <item.icon size={19} aria-hidden="true" />
            </Link>
          );
        })}
        <MenuTrigger>
          <Button className="mobile-more" data-active={moreActive} aria-label="More workspace navigation"><MoreHorizontal size={20} aria-hidden="true" /></Button>
          <Popover className="action-popover" placement="top end">
            <Menu className="action-menu" aria-label="More workspace pages">
              {moreNavigation.map((item) => <MenuItem href={item.href} key={item.href} textValue={item.name}>
                <item.icon size={17} aria-hidden="true" /><span>{item.name}</span>
              </MenuItem>)}
            </Menu>
          </Popover>
        </MenuTrigger>
      </nav>
    </>
  );
}
