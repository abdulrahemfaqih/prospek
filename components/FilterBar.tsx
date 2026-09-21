'use client';

import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { FilterParams, LeadStatus } from '@/lib/types';

interface FilterBarProps {
  filters: FilterParams;
  onFilterChange: (newFilters: Partial<FilterParams>) => void;
  onReset: () => void;
}

const PROVINCES_DATA: Record<string, { name: string; cities: string[] }> = {
  jatim: {
    name: 'Jawa Timur',
    cities: [
      'Surabaya', 'Malang', 'Batu', 'Sidoarjo', 'Gresik', 'Mojokerto',
      'Pasuruan', 'Probolinggo', 'Kediri', 'Blitar', 'Madiun', 'Jember',
      'Banyuwangi', 'Pamekasan', 'Sumenep', 'Sampang', 'Bangkalan',
    ],
  },
  jabar: {
    name: 'Jawa Barat',
    cities: [
      'Bandung', 'Cimahi', 'Bekasi', 'Depok', 'Bogor', 'Sukabumi',
      'Cirebon', 'Tasikmalaya', 'Garut', 'Karawang', 'Purwakarta',
    ],
  },
  jateng: {
    name: 'Jawa Tengah',
    cities: [
      'Semarang', 'Surakarta', 'Salatiga', 'Magelang', 'Pekalongan',
      'Tegal', 'Purwokerto', 'Kudus', 'Jepara', 'Klaten', 'Cilacap',
    ],
  },
  jakarta: {
    name: 'DKI Jakarta',
    cities: [
      'Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat',
      'Jakarta Selatan', 'Jakarta Timur',
    ],
  },
  banten: {
    name: 'Banten',
    cities: ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon'],
  },
};

const CATEGORIES = [
  { key: 'makanan', label: 'Makanan' },
  { key: 'persewaan', label: 'Persewaan' },
  { key: 'akomodasi', label: 'Akomodasi' },
  { key: 'jasa', label: 'Jasa' },
];

const STATUS_OPTIONS: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'Baru' },
  { key: 'contacted', label: 'Dihubungi' },
  { key: 'replied', label: 'Dibalas' },
  { key: 'demo', label: 'Pembuatan Demo' },
  { key: 'deal', label: 'Deal' },
  { key: 'development', label: 'Development' },
  { key: 'revisi', label: 'Revisi' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'rejected', label: 'Ditolak' },
];

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Local state for search input to ensure instant 0ms typing responsiveness
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Keep local search input synchronized if filter is reset or changed externally
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  // Debounce search input changes by 300ms to prevent lagging URL updates while typing fast
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentVal = filters.search || '';
      const newVal = searchValue.trim();
      if (newVal !== currentVal) {
        onFilterChange({ search: newVal || undefined, page: 1 });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFilterChange]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const currentVal = filters.search || '';
      const newVal = searchValue.trim();
      if (newVal !== currentVal) {
        onFilterChange({ search: newVal || undefined, page: 1 });
      }
    }
  };

  // Count active non-default filters for mobile badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.province && filters.province !== 'all') count++;
    if (filters.city && filters.city !== 'all') count++;
    if (filters.category_group && filters.category_group !== 'all') count++;
    if (filters.min_rating && filters.min_rating > 0) count++;
    if (filters.sort_by && filters.sort_by !== 'score') count++;
    if (filters.status && (filters.status.length !== 1 || filters.status[0] !== 'new')) count++;
    if (filters.has_wa_only) count++;
    if (!filters.no_website_only) count++;
    return count;
  }, [filters]);

  // Cities available based on selected province
  const availableCities = useMemo(() => {
    if (!filters.province || filters.province === 'all') {
      const allCities: string[] = [];
      Object.values(PROVINCES_DATA).forEach((p) => allCities.push(...p.cities));
      return Array.from(new Set(allCities)).sort();
    }

    const provEntry = Object.values(PROVINCES_DATA).find(
      (p) => p.name === filters.province || p.name.toLowerCase() === filters.province?.toLowerCase()
    );
    return provEntry ? provEntry.cities : [];
  }, [filters.province]);

  const handleStatusToggle = (statusKey: LeadStatus) => {
    const currentStatuses = filters.status || [];
    let newStatuses: LeadStatus[];
    if (currentStatuses.includes(statusKey)) {
      newStatuses = currentStatuses.filter((s) => s !== statusKey);
    } else {
      newStatuses = [...currentStatuses, statusKey];
    }
    onFilterChange({ status: newStatuses, page: 1 });
  };

  return (
    <section className="bg-[var(--color-paper)] pt-3 sm:pt-4 pb-2 border-b border-[var(--color-line)] space-y-2.5 sm:space-y-3 sticky top-[48px] z-20">
      {/* 1. Baris pencarian + Toggle filter mobile */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari nama usaha..."
            className="w-full h-[38px] pl-3 pr-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                onFilterChange({ search: undefined, page: 1 });
              }}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          aria-expanded={isMobileFilterOpen}
          aria-label="Toggle filter lanjutan"
          className="sm:hidden h-[38px] px-3 flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[13px] font-medium text-[var(--color-ink)] cursor-pointer hover:bg-[rgba(0,0,0,0.02)] transition-colors flex-shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-ink-muted)]" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Filter lanjutan (collapsible on mobile, always visible on sm+) */}
      <div className={`${isMobileFilterOpen ? 'block' : 'hidden'} sm:block space-y-2.5 sm:space-y-3`}>
        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center text-[13px]">
          {/* Provinsi */}
          <select
            value={filters.province || 'all'}
            onChange={(e) =>
              onFilterChange({
                province: e.target.value === 'all' ? undefined : e.target.value,
                city: undefined, // reset city when province changes
                page: 1,
              })
            }
            aria-label="Filter Provinsi"
            className="w-full sm:w-auto h-[36px] px-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="all">Semua provinsi</option>
            {Object.values(PROVINCES_DATA).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Kota */}
          <select
            value={filters.city || 'all'}
            onChange={(e) =>
              onFilterChange({
                city: e.target.value === 'all' ? undefined : e.target.value,
                page: 1,
              })
            }
            aria-label="Filter Kota"
            className="w-full sm:w-auto h-[36px] px-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="all">Semua kota</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Kategori */}
          <select
            value={filters.category_group || 'all'}
            onChange={(e) =>
              onFilterChange({
                category_group: e.target.value === 'all' ? undefined : e.target.value,
                page: 1,
              })
            }
            aria-label="Filter Kategori"
            className="w-full sm:w-auto h-[36px] px-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="all">Semua kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Rating Min */}
          <select
            value={filters.min_rating || 0}
            onChange={(e) =>
              onFilterChange({
                min_rating: Number(e.target.value) || undefined,
                page: 1,
              })
            }
            aria-label="Filter Rating Minimum"
            className="w-full sm:w-auto h-[36px] px-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value={0}>Semua rating</option>
            <option value={4.0}>Rating &gt;= 4.0</option>
            <option value={3.5}>Rating &gt;= 3.5</option>
          </select>

          {/* Urutan */}
          <select
            value={filters.sort_by || 'score'}
            onChange={(e) =>
              onFilterChange({
                sort_by: e.target.value as any,
                page: 1,
              })
            }
            aria-label="Urutkan Berdasarkan"
            className="col-span-2 sm:col-span-1 w-full sm:w-auto h-[36px] px-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="score">Skor tertinggi</option>
            <option value="rating">Rating tertinggi</option>
            <option value="reviews">Review terbanyak</option>
            <option value="newest">Terbaru di-scrape</option>
          </select>
        </div>

        {/* 3. Baris Chip filter & Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5">
          {/* Status horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full -mx-1 px-1">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = (filters.status || []).includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleStatusToggle(opt.key)}
                  className={`flex-shrink-0 h-[32px] px-3 rounded-[6px] text-[12px] font-medium border transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)] font-semibold'
                      : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:block h-[20px] w-[1px] bg-[var(--color-line)] mx-0.5 flex-shrink-0" />

          {/* Toggle Chips & Reset Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chip: Tanpa website */}
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  no_website_only: !filters.no_website_only,
                  page: 1,
                })
              }
              className={`h-[32px] px-3 rounded-[6px] text-[12px] font-medium border transition-colors cursor-pointer select-none ${
                filters.no_website_only
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)] font-semibold'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
              }`}
            >
              Tanpa website
            </button>

            {/* Chip: Ada WhatsApp */}
            <button
              type="button"
              onClick={() =>
                onFilterChange({
                  has_wa_only: !filters.has_wa_only,
                  page: 1,
                })
              }
              className={`h-[32px] px-3 rounded-[6px] text-[12px] font-medium border transition-colors cursor-pointer select-none ${
                filters.has_wa_only
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)] font-semibold'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
              }`}
            >
              Ada WhatsApp
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={onReset}
              className="sm:ml-auto h-[32px] px-2 text-[12px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:underline font-medium cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
