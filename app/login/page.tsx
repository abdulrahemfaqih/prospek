'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Email atau kata sandi salah. Periksa kembali dan coba lagi.');
        setIsLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMsg('Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-paper)]">
      <div className="w-full max-w-[360px] bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] p-6">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[var(--color-ink)] leading-[1.3] m-0">
            Prospek
          </h1>
          <p className="text-[13px] text-[var(--color-ink-muted)] mt-1 mb-0">
            Masuk untuk mengakses daftar calon klien
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 bg-[#F3E3E3] border border-[#E4BCBC] text-[#8C3B3B] text-[13px] rounded-[6px]"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-[var(--color-ink)] mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              className="w-full h-[36px] px-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-[var(--color-ink)] mb-1"
            >
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full h-[36px] px-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[36px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
