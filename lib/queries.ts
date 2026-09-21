import { SupabaseClient } from '@supabase/supabase-js';
import { BusinessWithLead, FilterParams, LeadStatus } from './types';

export const PAGE_SIZE = 50;

/**
 * Fetch paginated businesses with relation to leads from Supabase.
 * All filtering, sorting, and pagination are performed server-side.
 */
export async function fetchBusinesses(
  supabase: SupabaseClient,
  params: FilterParams
): Promise<{ data: BusinessWithLead[]; count: number }> {
  const page = Math.max(1, params.page || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Relation query
  // If status filter is applied, use leads!inner to filter by status
  const hasStatusFilter = params.status && params.status.length > 0;
  const selectQuery = hasStatusFilter ? '*, leads!inner(*)' : '*, leads(*)';

  let query = supabase
    .from('businesses')
    .select(selectQuery, { count: 'exact' });

  // 1. Search name
  if (params.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }

  // 2. Province filter
  if (params.province && params.province !== 'all') {
    query = query.eq('province', params.province);
  }

  // 3. City filter
  if (params.city && params.city !== 'all') {
    query = query.eq('city', params.city);
  }

  // 4. Category group filter
  if (params.category_group && params.category_group !== 'all') {
    query = query.eq('category_group', params.category_group);
  }

  // 5. Min rating filter
  if (params.min_rating && params.min_rating > 0) {
    query = query.gte('rating', params.min_rating);
  }

  // 6. No website only (website_kind in 'none' | 'social')
  if (params.no_website_only) {
    query = query.in('website_kind', ['none', 'social']);
  }

  // 7. Has WhatsApp only
  if (params.has_wa_only) {
    query = query.not('wa_number', 'is', null);
  }

  // 8. Status filter
  if (hasStatusFilter && params.status) {
    query = query.in('leads.status', params.status);
  }

  // 9. Sorting
  const sortBy = params.sort_by || 'score';
  if (sortBy === 'score') {
    query = query.order('lead_score', { ascending: false });
  } else if (sortBy === 'rating') {
    query = query.order('rating', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'reviews') {
    query = query.order('reviews_count', { ascending: false });
  } else if (sortBy === 'newest') {
    query = query.order('scraped_at', { ascending: false });
  }

  // 10. Pagination range
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching businesses:', error);
    throw new Error(error.message);
  }

  // Normalize relation data: businesses without a leads row default to status: 'new'
  const normalizedData: BusinessWithLead[] = (data || []).map((item: any) => {
    let lead = null;
    if (item.leads) {
      // If array from join, pick first
      lead = Array.isArray(item.leads) ? item.leads[0] || null : item.leads;
    }
    if (!lead) {
      lead = {
        business_id: item.place_id,
        status: 'new' as LeadStatus,
        notes: null,
        notes_updated_at: null,
        contacted_at: null,
        follow_up_at: null,
        updated_at: item.first_seen_at || new Date().toISOString(),
      };
    }
    return {
      ...item,
      leads: lead,
    };
  });

  return {
    data: normalizedData,
    count: count || 0,
  };
}

/**
 * Fetch summary statistics for /ringkasan page.
 */
export async function fetchSummaryStats(supabase: SupabaseClient) {
  // 1. Fetch count per status
  const { data: leadsData, error: leadsErr } = await supabase
    .from('leads')
    .select('status');

  if (leadsErr) {
    throw new Error(leadsErr.message);
  }

  const statusCounts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    replied: 0,
    demo: 0,
    deal: 0,
    development: 0,
    revisi: 0,
    selesai: 0,
    rejected: 0,
  };

  (leadsData || []).forEach((item: { status: LeadStatus }) => {
    if (item.status && statusCounts[item.status] !== undefined) {
      statusCounts[item.status]++;
    }
  });

  // 2. Fetch count per city & category group
  const { data: bizData, error: bizErr } = await supabase
    .from('businesses')
    .select('city, category_group');

  if (bizErr) {
    throw new Error(bizErr.message);
  }

  const cityCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  (bizData || []).forEach((item: { city: string | null; category_group: string | null }) => {
    const city = item.city || 'Lainnya';
    cityCounts[city] = (cityCounts[city] || 0) + 1;

    const cat = item.category_group || 'Lainnya';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return {
    statusCounts,
    cityCounts,
    categoryCounts,
    totalBusinesses: bizData?.length || 0,
  };
}

/**
 * Fetch recent scrape jobs for log audit.
 */
export async function fetchScrapeJobs(
  supabase: SupabaseClient,
  limit: number = 100
): Promise<import('./types').ScrapeJob[]> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as import('./types').ScrapeJob[];
}

