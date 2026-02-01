-- Agregar campo de retención ISR a la tabla de facturas
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS isr_retention_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS isr_retention_amount numeric DEFAULT 0;