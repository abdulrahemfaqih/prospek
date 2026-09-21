/**
 * Type definitions for Prospek database entities and UI models.
 */

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'demo' | 'deal' | 'development' | 'revisi' | 'selesai' | 'rejected';

export type WebsiteKind = 'none' | 'social' | 'own';

export interface Business {
  place_id: string;
  source: string;
  name: string;
  category: string | null;
  category_group: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  wa_number: string | null;
  website: string | null;
  has_website: boolean;
  website_kind: WebsiteKind;
  rating: number | null;
  reviews_count: number;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  lead_score: number;
  first_seen_at: string;
  scraped_at: string;
}

export interface Lead {
  business_id: string;
  status: LeadStatus;
  notes: string | null;
  notes_updated_at: string | null;
  contacted_at: string | null;
  follow_up_at: string | null;
  updated_at: string;
}

export interface BusinessWithLead extends Business {
  leads: Lead | null;
}

export interface ScrapeJob {
  id: number;
  source: string;
  province: string;
  city: string;
  keyword: string;
  pages_fetched: number;
  places_found: number;
  places_new: number;
  ran_at: string;
}

export interface FilterParams {
  search?: string;
  province?: string;
  city?: string;
  category_group?: string;
  min_rating?: number;
  status?: LeadStatus[];
  no_website_only?: boolean;
  has_wa_only?: boolean;
  sort_by?: 'score' | 'rating' | 'reviews' | 'newest';
  page?: number;
}
