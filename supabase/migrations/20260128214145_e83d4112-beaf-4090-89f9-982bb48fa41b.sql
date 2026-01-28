-- Tabla de directorio de tribunales de República Dominicana
CREATE TABLE public.court_directory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    court_type TEXT NOT NULL, -- suprema_corte, tribunal_constitucional, corte_apelacion, primera_instancia, juzgado_paz, tribunal_laboral, tribunal_nna, tribunal_tierras
    jurisdiction TEXT, -- Distrito Nacional, Santo Domingo Este, Santiago, etc.
    department TEXT, -- Sala Civil, Sala Penal, etc.
    address TEXT,
    phone TEXT,
    phone_secondary TEXT,
    email TEXT,
    website TEXT,
    schedule TEXT, -- Horario de atención
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de directorio de alguaciles
CREATE TABLE public.bailiff_directory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    license_number TEXT, -- Número de matrícula
    court_assigned TEXT, -- Tribunal asignado
    jurisdiction TEXT, -- Jurisdicción donde opera
    phone TEXT,
    phone_secondary TEXT,
    email TEXT,
    address TEXT,
    specialization TEXT, -- civil, penal, laboral, etc.
    status TEXT DEFAULT 'active', -- active, inactive
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.court_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bailiff_directory ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para court_directory
CREATE POLICY "Users can view own court contacts" ON public.court_directory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own court contacts" ON public.court_directory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own court contacts" ON public.court_directory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own court contacts" ON public.court_directory
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para bailiff_directory
CREATE POLICY "Users can view own bailiff contacts" ON public.bailiff_directory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bailiff contacts" ON public.bailiff_directory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bailiff contacts" ON public.bailiff_directory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bailiff contacts" ON public.bailiff_directory
    FOR DELETE USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_court_directory_updated_at
    BEFORE UPDATE ON public.court_directory
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bailiff_directory_updated_at
    BEFORE UPDATE ON public.bailiff_directory
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();