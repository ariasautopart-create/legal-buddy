-- Create notary_directory table for public notaries in Dominican Republic
CREATE TABLE public.notary_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  license_number TEXT, -- Número de matrícula/colegiatura
  notary_type TEXT DEFAULT 'publico', -- publico, de_fe_publica
  jurisdiction TEXT, -- Provincia/municipio donde ejerce
  office_name TEXT, -- Nombre de la notaría
  address TEXT,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  website TEXT,
  schedule TEXT, -- Horario de atención
  specializations TEXT[], -- Áreas de especialización
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notary_directory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notary contacts" 
ON public.notary_directory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notary contacts" 
ON public.notary_directory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notary contacts" 
ON public.notary_directory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notary contacts" 
ON public.notary_directory 
FOR DELETE 
USING (auth.uid() = user_id);