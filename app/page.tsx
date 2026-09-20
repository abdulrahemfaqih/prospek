'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { BusinessTable } from '@/components/BusinessTable';
import { DetailDrawer } from '@/components/DetailDrawer';
import { FilterBar } from '@/components/FilterBar';
import { Navbar } from '@/components/Navbar';
import { Pagination } from '@/components/Pagination';
import { fetchBusinesses, PAGE_SIZE } from '@/lib/queries';
import { createClient } from '@/lib/supabase/client';
import { BusinessWithLead, FilterParams, LeadStatus } from '@/lib/types';

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // 1. Read filters from URL query parameters (defaults: no_website=true, sort=score, status=new)
  const filters: FilterParams = useMemo(() => {
    const q = searchParams.get('q') || undefined;
    const province = searchParams.get('province') || undefined;
    const city = searchParams.get('city') || undefined;
    const category_group = searchParams.get('group') || undefined;
    const min_rating = searchParams.get('min_rating')
      ? Number(searchParams.get('min_rating'))
      : undefined;

    // Default status is ['new'] unless explicitly overridden in URL
    const statusParam = searchParams.get('status');
    let status: LeadStatus[] | undefined = undefined;
    if (statusParam) {
      status = statusParam
        .split(',')
        .filter(Boolean) as LeadStatus[];
    } else if (!searchParams.has('status')) {
      status = ['new'];
    }

    // Default no_website_only is true unless explicitly set to 'false'
    const noWebParam = searchParams.get('no_website');
    const no_website_only = noWebParam === null ? true : noWebParam === 'true';

    const has_wa_only = searchParams.get('has_wa') === 'true';
    const sort_by = (searchParams.get('sort') as any) || 'score';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    return {
      search: q,
      province,
      city,
      category_group,
      min_rating,
      status,
      no_website_only,
      has_wa_only,
      sort_by,
      page,
    };
  }, [searchParams]);

  // Check if any non-default filter is active
  const hasActiveFilter = Boolean(
    filters.search ||
      filters.province ||
      filters.city ||
      filters.category_group ||
      filters.min_rating ||
      filters.has_wa_only ||
      (filters.status && (filters.status.length !== 1 || filters.status[0] !== 'new')) ||
      !filters.no_website_only
  );

  // 2. Fetch businesses via TanStack Query (server-side query)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['businesses', filters],
    queryFn: () => fetchBusinesses(supabase, filters),
    placeholderData: keepPreviousData,
  });

  // Selected place ID for DetailDrawer (synced with cache)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const selectedBusiness = useMemo(() => {
    if (!selectedPlaceId || !data?.data) return null;
    return data.data.find((b) => b.place_id === selectedPlaceId) || null;
  }, [data?.data, selectedPlaceId]);

  // 3. Update URL query params
  const updateUrlFilters = (updated: Partial<FilterParams>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Search query
    if ('search' in updated) {
      if (updated.search && updated.search.trim()) {
        params.set('q', updated.search.trim());
      } else {
        params.delete('q');
      }
    }

    // Location & Category
    if ('province' in updated) {
      if (updated.province && updated.province !== 'all') {
        params.set('province', updated.province);
      } else {
        params.delete('province');
      }
    }

    if ('city' in updated) {
      if (updated.city && updated.city !== 'all') {
        params.set('city', updated.city);
      } else {
        params.delete('city');
      }
    }

    if ('category_group' in updated) {
      if (updated.category_group && updated.category_group !== 'all') {
        params.set('group', updated.category_group);
      } else {
        params.delete('group');
      }
    }

    if ('min_rating' in updated) {
      if (updated.min_rating && updated.min_rating > 0) {
        params.set('min_rating', String(updated.min_rating));
      } else {
        params.delete('min_rating');
      }
    }

    // Status
    if ('status' in updated) {
      if (updated.status && updated.status.length > 0) {
        params.set('status', updated.status.join(','));
      } else {
        params.set('status', ''); // empty status filter
      }
    }

    // Chips
    if ('no_website_only' in updated) {
      params.set('no_website', String(Boolean(updated.no_website_only)));
    }

    if ('has_wa_only' in updated) {
      if (updated.has_wa_only) {
        params.set('has_wa', 'true');
      } else {
        params.delete('has_wa');
      }
    }

    // Sort
    if ('sort_by' in updated) {
      if (updated.sort_by && updated.sort_by !== 'score') {
        params.set('sort', updated.sort_by);
      } else {
        params.delete('sort');
      }
    }

    // Page
    if ('page' in updated) {
      if (updated.page && updated.page > 1) {
        params.set('page', String(updated.page));
      } else {
        params.delete('page');
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    router.replace(pathname, { scroll: false }); // resets all query params to defaults
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-paper)]">
      <Navbar />

      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 flex-1 flex flex-col pb-8">
        <FilterBar
          filters={filters}
          onFilterChange={updateUrlFilters}
          onReset={handleResetFilters}
        />

        {isError ? (
          <div className="p-8 text-center bg-[var(--color-surface)] border border-[var(--color-line)] my-4 rounded-[6px]">
            <p className="text-[14px] text-[#8C3B3B] font-medium mb-1">
              Gagal memuat data.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {error instanceof Error ? error.message : 'Periksa koneksi lalu coba lagi.'}
            </p>
          </div>
        ) : (
          <>
            <BusinessTable
              businesses={data?.data || []}
              isLoading={isLoading}
              selectedId={selectedPlaceId}
              onSelectBusiness={(biz) => setSelectedPlaceId(biz.place_id)}
              hasActiveFilter={hasActiveFilter}
            />

            <Pagination
              currentPage={filters.page || 1}
              pageSize={PAGE_SIZE}
              totalCount={data?.count || 0}
              onPageChange={(newPage) => updateUrlFilters({ page: newPage })}
            />

            <DetailDrawer
              business={selectedBusiness}
              isOpen={Boolean(selectedBusiness)}
              onClose={() => setSelectedPlaceId(null)}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[14px] text-[var(--color-ink-muted)]">Memuat dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
