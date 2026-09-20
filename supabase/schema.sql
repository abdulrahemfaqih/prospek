-- ==========================================================
-- PROSPEK DATABASE SCHEMA (supabase/schema.sql)
-- ==========================================================

-- 1. Ekstensi untuk pencarian teks fuzzy / trigram
create extension if not exists pg_trgm;

-- 2. Tabel data usaha hasil scraping
create table businesses (
  place_id       text primary key,   -- place_id dari SerpApi; fallback "data:<data_id>" bila tidak ada
  source         text not null default 'serpapi',
  name           text not null,
  category       text,               -- label tipe usaha dari hasil
  category_group text,               -- makanan | persewaan | jasa | akomodasi | lainnya
  province       text,
  city           text,
  address        text,
  phone          text,
  wa_number      text,               -- 62xxxxxxxxxx, null jika bukan nomor seluler
  website        text,
  has_website    boolean not null default false,
  website_kind   text,               -- none | social | own
  rating         numeric(2,1),
  reviews_count  integer default 0,
  maps_url       text,
  lat            double precision,
  lng            double precision,
  lead_score     integer not null default 0,
  first_seen_at  timestamptz not null default now(),
  scraped_at     timestamptz not null default now()
);

-- 3. Tabel status kerja dan tindak lanjut CRM
create table leads (
  business_id      text primary key references businesses(place_id) on delete cascade,
  status           text not null default 'new'
                   check (status in ('new','contacted','replied','deal','rejected')),
  notes            text check (notes is null or char_length(notes) <= 20000),  -- markdown mentah
  notes_updated_at timestamptz,
  contacted_at     timestamptz,
  follow_up_at     date,
  updated_at       timestamptz not null default now()
);

-- 4. Tabel riwayat scraping untuk deduplikasi 30 hari & anggaran
create table scrape_jobs (
  id             bigserial primary key,
  source         text not null default 'serpapi',
  province       text not null,
  city           text not null,
  keyword        text not null,
  pages_fetched  integer not null default 0,   -- = jumlah pencarian SerpApi yang terpakai
  places_found   integer not null default 0,
  places_new     integer not null default 0,
  ran_at         timestamptz not null default now()
);

-- 5. Tabel heartbeat untuk mencegah proyek Supabase free-tier ter-pause
create table heartbeat (
  id         smallint primary key default 1 check (id = 1),
  pinged_at  timestamptz not null default now()
);
insert into heartbeat (id) values (1) on conflict do nothing;

-- 6. Indeks untuk optimasi query dashboard & pencarian
create index on businesses (province, city);
create index on businesses (category_group);
create index on businesses (has_website, lead_score desc);
create index on businesses using gin (name gin_trgm_ops);

-- 7. Row Level Security (RLS)
alter table businesses  enable row level security;
alter table leads       enable row level security;
alter table scrape_jobs enable row level security;
alter table heartbeat   enable row level security;

-- Policies untuk authenticated user (dashboard)
create policy "auth read businesses"  on businesses  for select to authenticated using (true);
create policy "auth read leads"       on leads       for select to authenticated using (true);
create policy "auth write leads"      on leads       for update to authenticated using (true) with check (true);
create policy "auth insert leads"     on leads       for insert to authenticated with check (true);
create policy "auth read scrape_jobs" on scrape_jobs for select to authenticated using (true);

-- Catatan: Tabel heartbeat sengaja tidak diberi policy untuk authenticated.
-- Hanya service role key (yang mem-bypass RLS) yang dapat menyentuhnya lewat cron keepalive.

-- 8. Trigger otomatis memastikan setiap baris baru di businesses memiliki baris leads default (status: 'new')
create or replace function public.handle_new_business()
returns trigger as $$
begin
  insert into public.leads (business_id, status)
  values (new.place_id, 'new')
  on conflict (business_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_business_created
  after insert on public.businesses
  for each row execute function public.handle_new_business();

