-- Add ApiSunat credentials to empresa_configuracion
ALTER TABLE empresa_configuracion
  ADD COLUMN IF NOT EXISTS apisunat_persona_id TEXT,
  ADD COLUMN IF NOT EXISTS apisunat_persona_token TEXT;

COMMENT ON COLUMN empresa_configuracion.apisunat_persona_id IS 'PersonaId de ApiSunat para emisión de comprobantes.';
COMMENT ON COLUMN empresa_configuracion.apisunat_persona_token IS 'PersonaToken de ApiSunat para emisión de comprobantes.';
