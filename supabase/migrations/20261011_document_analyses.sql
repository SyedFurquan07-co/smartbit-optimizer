-- Migration: Document Analyses Table & Ownership RLS Policies
-- Proposed schema for dedicated multi-category PDF intelligence persistence

CREATE TABLE IF NOT EXISTS public.document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_count INT NOT NULL DEFAULT 1,
  document_category TEXT NOT NULL DEFAULT 'general',
  document_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  analysis_result JSONB NOT NULL,
  uploaded_proposal_id UUID REFERENCES public.uploaded_proposals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: authenticated users can only view their own document analyses
CREATE POLICY "Users can select own document analyses"
  ON public.document_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. INSERT Policy: authenticated users can only insert records with their own verified UID
CREATE POLICY "Users can insert own document analyses"
  ON public.document_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: authenticated users can only update their own document analyses
CREATE POLICY "Users can update own document analyses"
  ON public.document_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: authenticated users can only delete their own document analyses
CREATE POLICY "Users can delete own document analyses"
  ON public.document_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Performance indices for user scoping and chronological sorting
CREATE INDEX IF NOT EXISTS idx_document_analyses_user_id ON public.document_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_document_analyses_created_at ON public.document_analyses (created_at DESC);
