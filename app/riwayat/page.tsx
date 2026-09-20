'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, History, Search } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { fetchScrapeJobs } from '@/lib/queries';
import { createClient } from '@/lib/supabase/client';
import { ScrapeJob } from '@/lib/types';

export default function RiwayatPage() {
  const supabase = useMemo(() => createClient(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  const { data: jobs = [], isLoading, isError, error } = useQuery({
    queryKey: ['scrape_jobs'],
    queryFn: () => fetchScrapeJobs(supabase, 200),
  });

  // Cities list from jobs
  const cities = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.city) set.add(j.city);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !searchTerm.trim() ||
        job.keyword.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        job.city.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchesCity = selectedCity === 'all' || job.city === selectedCity;

      return matchesSearch && matchesCity;
    });
  }, [jobs, searchTerm, selectedCity]);

  // Overall metrics
  const totalPlacesFound = useMemo(
    () => jobs.reduce((acc, j) => acc + (j.places_found || 0), 0),
    [jobs]
  );
  const totalPlacesNew = useMemo(
    () => jobs.reduce((acc, j) => acc + (j.places_new || 0), 0),
    [jobs]
  );

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoStr;
    }
  };

  const getDaysAgo = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-paper)]">
      <Navbar />

      <main className="max-w-[1280px] w-full mx-auto px-3.5 sm:px-6 py-6 space-y-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-[20px] font-semibold text-[var(--color-ink)] leading-[1.3] m-0 flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--color-accent)]" />
              Riwayat Scraping
            </h1>
            <p className="text-[13px] text-[var(--color-ink-muted)] mt-1 mb-0">
              Audit log riil pencarian data Google Maps untuk koordinasi tim dan pemantauan kuota
            </p>
          </div>
        </div>

        {/* Ringkasan Metrik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] flex flex-col justify-between">
            <span className="text-[12px] text-[var(--color-ink-muted)]">Total Pencarian</span>
            <span className="text-[22px] font-semibold text-[var(--color-ink)] tabular-nums mt-1">
              {jobs.length.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] flex flex-col justify-between">
            <span className="text-[12px] text-[var(--color-ink-muted)]">Total Tempat Ditemukan</span>
            <span className="text-[22px] font-semibold text-[var(--color-ink)] tabular-nums mt-1">
              {totalPlacesFound.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] flex flex-col justify-between">
            <span className="text-[12px] text-[var(--color-ink-muted)]">Tempat Baru Masuk</span>
            <span className="text-[22px] font-semibold text-[#246636] tabular-nums mt-1">
              {totalPlacesNew.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] flex flex-col justify-between">
            <span className="text-[12px] text-[var(--color-ink-muted)]">Kota Terdata</span>
            <span className="text-[22px] font-semibold text-[var(--color-ink)] tabular-nums mt-1">
              {cities.length} Kota
            </span>
          </div>
        </div>

        {/* Info Banner Koordinasi */}
        <div className="p-3.5 bg-[var(--color-accent-soft)]/50 border border-[var(--color-accent)]/20 rounded-[6px] text-[13px] text-[var(--color-ink)] flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[var(--color-accent)]">Koordinasi Antar-Pengguna:</span>
            <p className="text-[12px] text-[var(--color-ink-muted)] m-0 leading-relaxed">
              Jika kata kunci sudah diambil pada <strong>Halaman 1 s/d 2</strong>, Anda atau rekan Anda tidak perlu mengambilnya lagi. Jika ingin mencari data tambahan yang lebih dalam, gunakan perintah <code className="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-line)] font-mono text-[11px]">--pages 4 --refresh</code> untuk mengambil data lanjutan.
            </p>
          </div>
        </div>

        {/* Filter Bar untuk Log */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 sm:max-w-[320px]">
            <Search className="w-4 h-4 text-[var(--color-ink-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kata kunci atau kota..."
              className="w-full h-[36px] pl-9 pr-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-[36px] px-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[13px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
            >
              <option value="all">Semua Kota ({jobs.length})</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Konten Data */}
        {isLoading ? (
          <div className="p-12 text-center text-[var(--color-ink-muted)] text-[14px] bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px]">
            Memuat riwayat log scraping...
          </div>
        ) : isError ? (
          <div className="p-6 text-center bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px]">
            <p className="text-[14px] text-[#8C3B3B] font-medium mb-1">
              Gagal memuat log riwayat.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {error instanceof Error ? error.message : 'Periksa koneksi lalu coba lagi.'}
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px]">
            <p className="text-[14px] text-[var(--color-ink)] font-medium mb-1">
              Tidak ada log yang cocok.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {searchTerm || selectedCity !== 'all'
                ? 'Coba bersihkan filter pencarian di atas.'
                : 'Belum ada riwayat scraping yang tersimpan.'}
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] overflow-hidden">
            {/* 1. Mobile Card List (<640px) */}
            <div className="block sm:hidden divide-y divide-[var(--color-line)]">
              {filteredJobs.map((job) => {
                const daysAgo = getDaysAgo(job.ran_at);
                const isRecent = daysAgo < 30;
                const pages = job.pages_fetched || 1;
                const maxIndex = pages * 20;

                return (
                  <div key={job.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[14px] font-semibold text-[var(--color-ink)] font-mono">
                          {job.keyword}
                        </span>
                        <p className="text-[12px] text-[var(--color-ink-muted)] m-0">
                          {job.city}, {job.province}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          isRecent
                            ? 'bg-[#EAF5EC] text-[#246636]'
                            : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)]'
                        }`}
                      >
                        {isRecent ? 'Aktif (<30h)' : `${daysAgo}h lalu`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[12px] pt-1 border-t border-[var(--color-line)]/50">
                      <div>
                        <span className="font-semibold text-[var(--color-ink)]">
                          Halaman 1 s/d {pages}
                        </span>{' '}
                        <span className="text-[var(--color-ink-muted)]">
                          (Data #{1}–{maxIndex})
                        </span>
                      </div>
                      <div className="text-[var(--color-ink-muted)] tabular-nums">
                        <strong className="text-[var(--color-ink)]">{job.places_found}</strong> usaha ({job.places_new} baru)
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--color-ink-faint)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(job.ran_at)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table (>=640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="h-[38px] border-b border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] font-medium">
                    <th className="px-4 font-medium">Waktu Eksekusi</th>
                    <th className="px-4 font-medium">Kota & Provinsi</th>
                    <th className="px-4 font-medium">Kata Kunci</th>
                    <th className="px-4 font-medium">Halaman yang Diambil</th>
                    <th className="px-4 font-medium">Cakupan Data</th>
                    <th className="px-4 font-medium text-right">Hasil Ditemukan</th>
                    <th className="px-4 font-medium text-right">Status 30 Hari</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {filteredJobs.map((job) => {
                    const daysAgo = getDaysAgo(job.ran_at);
                    const isRecent = daysAgo < 30;
                    const pages = job.pages_fetched || 1;
                    const maxIndex = pages * 20;

                    return (
                      <tr key={job.id} className="h-[48px] hover:bg-[#F8F9FA] transition-colors">
                        <td className="px-4 text-[var(--color-ink-muted)] whitespace-nowrap">
                          {formatDate(job.ran_at)}
                        </td>
                        <td className="px-4 whitespace-nowrap">
                          <span className="font-medium text-[var(--color-ink)]">{job.city}</span>
                          <span className="text-[var(--color-ink-muted)] text-[12px]">, {job.province}</span>
                        </td>
                        <td className="px-4 whitespace-nowrap">
                          <code className="bg-[var(--color-paper)] px-2 py-0.5 rounded font-mono text-[12px] text-[var(--color-ink)]">
                            {job.keyword}
                          </code>
                        </td>
                        <td className="px-4 whitespace-nowrap font-medium text-[var(--color-ink)]">
                          Halaman 1 s/d {pages}
                        </td>
                        <td className="px-4 whitespace-nowrap text-[var(--color-ink-muted)] text-[12px]">
                          Usaha urutan #1 s/d #{maxIndex}
                        </td>
                        <td className="px-4 text-right whitespace-nowrap tabular-nums">
                          <span className="font-semibold text-[var(--color-ink)]">{job.places_found}</span>
                          <span className="text-[var(--color-ink-muted)] text-[12px]"> ({job.places_new} baru)</span>
                        </td>
                        <td className="px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${
                              isRecent
                                ? 'bg-[#EAF5EC] text-[#246636]'
                                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)]'
                            }`}
                          >
                            {isRecent ? '< 30 hari (Aktif)' : `${daysAgo} hari lalu`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
