'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchSummaryStats } from '@/lib/queries';
import { createClient } from '@/lib/supabase/client';
import { LeadStatus } from '@/lib/types';

const STATUS_PROSPECT: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'Baru' },
  { key: 'contacted', label: 'Dihubungi' },
  { key: 'replied', label: 'Dibalas' },
  { key: 'rejected', label: 'Ditolak' },
];

const STATUS_PROJECT: { key: LeadStatus; label: string }[] = [
  { key: 'demo', label: 'Pembuatan Demo' },
  { key: 'deal', label: 'Deal' },
  { key: 'development', label: 'Development' },
  { key: 'revisi', label: 'Revisi' },
  { key: 'selesai', label: 'Selesai' },
];

export default function RingkasanPage() {
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['summary_stats'],
    queryFn: () => fetchSummaryStats(supabase),
  });

  // Calculate max counts for CSS bar scaling
  const maxCityCount = useMemo(() => {
    if (!data?.cityCounts) return 1;
    const values = Object.values(data.cityCounts);
    return Math.max(...values, 1);
  }, [data?.cityCounts]);

  const maxCatCount = useMemo(() => {
    if (!data?.categoryCounts) return 1;
    const values = Object.values(data.categoryCounts);
    return Math.max(...values, 1);
  }, [data?.categoryCounts]);

  // Sort cities by count descending
  const sortedCities = useMemo(() => {
    if (!data?.cityCounts) return [];
    return Object.entries(data.cityCounts).sort((a, b) => b[1] - a[1]);
  }, [data?.cityCounts]);

  // Sort categories by count descending
  const sortedCategories = useMemo(() => {
    if (!data?.categoryCounts) return [];
    return Object.entries(data.categoryCounts).sort((a, b) => b[1] - a[1]);
  }, [data?.categoryCounts]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-paper)]">
      <Navbar />

      <main className="max-w-[720px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-ink)] leading-[1.3] m-0">
            Ringkasan
          </h1>
          <p className="text-[13px] text-[var(--color-ink-muted)] mt-1 mb-0">
            Statistik pencarian dan tindak lanjut calon klien
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-ink-muted)] text-[14px] bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px]">
            Memuat statistik...
          </div>
        ) : isError ? (
          <div className="p-6 text-center bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px]">
            <p className="text-[14px] text-[#8C3B3B] font-medium mb-1">
              Gagal memuat ringkasan data.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {error instanceof Error ? error.message : 'Periksa koneksi lalu coba lagi.'}
            </p>
          </div>
        ) : (
          <>
            {/* 1. Status Leads */}
            <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] p-5 space-y-5">
              <h2 className="text-[14px] font-semibold text-[var(--color-ink)] m-0">
                Status Calon Klien
              </h2>

              {/* Grup Prospek */}
              <div>
                <p className="text-[11px] text-[var(--color-ink-faint)] font-medium uppercase tracking-wider mb-2">
                  Prospek
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STATUS_PROSPECT.map((item) => {
                    const count = data?.statusCounts[item.key] || 0;
                    return (
                      <div
                        key={item.key}
                        className="p-3 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[6px] flex flex-col justify-between space-y-2"
                      >
                        <StatusBadge status={item.key} />
                        <span className="text-[20px] font-semibold text-[var(--color-ink)] tabular-nums">
                          {count.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grup Pengerjaan Proyek */}
              <div>
                <p className="text-[11px] text-[var(--color-ink-faint)] font-medium uppercase tracking-wider mb-2">
                  Pengerjaan Proyek
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {STATUS_PROJECT.map((item) => {
                    const count = data?.statusCounts[item.key] || 0;
                    return (
                      <div
                        key={item.key}
                        className="p-3 bg-[#F7F4FC] border border-[#D8CCEE] rounded-[6px] flex flex-col justify-between space-y-2"
                      >
                        <StatusBadge status={item.key} />
                        <span className="text-[20px] font-semibold text-[var(--color-ink)] tabular-nums">
                          {count.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[13px] text-[var(--color-ink-muted)] pt-1 border-t border-[var(--color-line)] flex justify-between items-center">
                <span>Total usaha terdata:</span>
                <span className="font-semibold text-[var(--color-ink)] tabular-nums">
                  {(data?.totalBusinesses || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </section>

            {/* 2. Jumlah Lead per Kota (Tabel + Bar CSS tipis) */}
            <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] p-4 sm:p-5 space-y-4">
              <h2 className="text-[14px] font-semibold text-[var(--color-ink)] m-0">
                Sebaran Kota
              </h2>

              {sortedCities.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ink-muted)]">
                  Belum ada data kota tersimpan.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedCities.map(([cityName, count]) => {
                    const percentage = Math.round((count / maxCityCount) * 100);
                    return (
                      <div key={cityName} className="space-y-1">
                        <div className="flex justify-between items-center text-[13px] gap-2">
                          <span className="text-[var(--color-ink)] font-medium truncate">
                            {cityName}
                          </span>
                          <span className="text-[var(--color-ink-muted)] tabular-nums flex-shrink-0">
                            {count.toLocaleString('id-ID')} usaha
                          </span>
                        </div>
                        {/* Thin CSS bar per design.md */}
                        <div className="w-full h-[6px] bg-[var(--color-paper)] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Kelompok Kategori */}
            <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] p-4 sm:p-5 space-y-4">
              <h2 className="text-[14px] font-semibold text-[var(--color-ink)] m-0">
                Kelompok Kategori
              </h2>

              {sortedCategories.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ink-muted)]">
                  Belum ada kategori tersimpan.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map(([catKey, count]) => {
                    const percentage = Math.round((count / maxCatCount) * 100);
                    const catLabel =
                      catKey === 'makanan'
                        ? 'Makanan & Minuman'
                        : catKey === 'persewaan'
                        ? 'Persewaan'
                        : catKey === 'akomodasi'
                        ? 'Akomodasi & Wisata'
                        : catKey === 'jasa'
                        ? 'Jasa & Perbaikan'
                        : catKey;
                    return (
                      <div key={catKey} className="space-y-1">
                        <div className="flex justify-between items-center text-[13px] gap-2">
                          <span className="text-[var(--color-ink)] font-medium truncate">
                            {catLabel}
                          </span>
                          <span className="text-[var(--color-ink-muted)] tabular-nums flex-shrink-0">
                            {count.toLocaleString('id-ID')} usaha
                          </span>
                        </div>
                        {/* Thin CSS bar per design.md */}
                        <div className="w-full h-[6px] bg-[var(--color-paper)] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-[13px] text-[var(--color-accent)] hover:underline font-medium"
              >
                &larr; Kembali ke daftar usaha
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
