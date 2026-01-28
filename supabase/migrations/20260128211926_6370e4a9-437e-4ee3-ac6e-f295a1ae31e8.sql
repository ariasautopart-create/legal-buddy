-- Crear bucket para documentos legales
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', false);

-- Políticas de storage para el bucket
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'legal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'legal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'legal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Crear tabla de documentos
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documents
CREATE POLICY "Users can view own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents" 
ON public.documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
ON public.documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
ON public.documents FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_documents_updated_at 
BEFORE UPDATE ON public.documents 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();