'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Sparkles,
  Settings,
  Moon,
  Sun,
  User,
  ChevronRight,
  FileText,
  TrendingUp,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const pathname = usePathname();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Scenario Library', href: '/scenarios', icon: FileText },
    { name: 'Generate Scenarios', href: '/scenarios/new', icon: Sparkles },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  ];

  const bottomNavigation = [
    { name: 'Help & Support', href: '/help', icon: HelpCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden glass-panel p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-5 h-5 text-[var(--text-primary)]" /> : <Menu className="w-5 h-5 text-[var(--text-primary)]" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col',
          'glass-panel border-r border-[var(--border)]',
          'transition-transform duration-300 ease-in-out',
          'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-accent-600" />
            <span className="text-base font-medium text-[var(--text-primary)] tracking-tight">
              AI Foresight
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[var(--surface)] transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-600 to-accent-700 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                Enterprise User
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                Strategic Planning Team
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'text-sm font-medium tracking-tight',
                    isActive
                      ? 'bg-accent-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-[var(--border)]" />

          {/* Bottom Navigation */}
          <div className="space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'text-sm font-medium tracking-tight',
                    isActive
                      ? 'bg-accent-600 text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] space-y-3">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg glass-panel">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
              ) : (
                <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
              )}
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                theme === 'dark' ? 'bg-accent-600' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Sign Out */}
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-red-500 transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
