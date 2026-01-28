-- Create storage bucket for legal resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-resources', 'legal-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for legal resources bucket
CREATE POLICY "Users can view own legal resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'legal-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own legal resources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'legal-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own legal resources"
ON storage.objects FOR UPDATE
USING (bucket_id = 'legal-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own legal resources"
ON storage.objects FOR DELETE
USING (bucket_id = 'legal-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create legal_resources table
CREATE TABLE public.legal_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  reference_number TEXT,
  issue_date DATE,
  source TEXT,
  keywords TEXT[],
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own legal resources"
ON public.legal_resources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own legal resources"
ON public.legal_resources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own legal resources"
ON public.legal_resources FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own legal resources"
ON public.legal_resources FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_legal_resources_updated_at
BEFORE UPDATE ON public.legal_resources
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();