'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Daftar' },
    { href: '/ringkasan', label: 'Ringkasan' },
    { href: '/riwayat', label: 'Riwayat' },
  ];

  return (
    <header className="h-[48px] border-b border-[var(--color-line)] bg-[var(--color-surface)] sticky top-0 z-30">
      <div className="max-w-[1280px] mx-auto h-full px-3.5 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-5 sm:space-x-6">
          <Link
            href="/"
            className="text-[16px] font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors py-1"
          >
            Prospek
          </Link>
          <nav className="flex items-center space-x-1 sm:space-x-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[13px] px-2 py-1.5 rounded-[6px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-accent)] font-semibold bg-[var(--color-accent-soft)]/60'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(0,0,0,0.02)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleSignOut}
          type="button"
          className="text-[13px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] font-medium transition-colors cursor-pointer py-1.5 px-2 rounded-[6px] hover:bg-[rgba(0,0,0,0.02)]"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
