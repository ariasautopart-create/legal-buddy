-- Agregar campos para facturación electrónica de República Dominicana
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DOP',
ADD COLUMN IF NOT EXISTS ncf_type text,
ADD COLUMN IF NOT EXISTS ncf text,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS rnc_cedula text;

-- Comentarios descriptivos para los campos
COMMENT ON COLUMN public.invoices.currency IS 'Moneda: DOP (Peso Dominicano) o USD (Dólar)';
COMMENT ON COLUMN public.invoices.ncf_type IS 'Tipo de NCF: B01 Crédito Fiscal, B02 Consumo Final, B14 Régimen Especial, B15 Gubernamental, B16 Exportación';
COMMENT ON COLUMN public.invoices.ncf IS 'Número de Comprobante Fiscal (NCF)';
COMMENT ON COLUMN public.invoices.exchange_rate IS 'Tasa de cambio USD a DOP';
COMMENT ON COLUMN public.invoices.rnc_cedula IS 'RNC o Cédula del cliente';