-- ==========================================================
-- MIGRATION: Update status leads — demo, development, revisi, selesai
-- Jalankan di Supabase SQL Editor
-- ==========================================================

-- Drop constraint lama dan buat yang baru dengan nilai lengkap
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'replied', 'demo', 'deal', 'development', 'revisi', 'selesai', 'rejected'));
