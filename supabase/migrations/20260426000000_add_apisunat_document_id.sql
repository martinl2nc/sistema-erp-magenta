-- Add ApiSunat documentId to support PDF retrieval after emission
ALTER TABLE comprobantes
  ADD COLUMN IF NOT EXISTS apisunat_document_id TEXT;

ALTER TABLE guias_remision
  ADD COLUMN IF NOT EXISTS apisunat_document_id TEXT;

COMMENT ON COLUMN comprobantes.apisunat_document_id IS 'ID del documento en ApiSunat. NULL indica comprobante emitido con ApisPeru (legacy).';
COMMENT ON COLUMN guias_remision.apisunat_document_id IS 'ID del documento en ApiSunat. NULL indica guía emitida con ApisPeru (legacy).';

CREATE INDEX IF NOT EXISTS idx_comprobantes_apisunat_doc_id
  ON comprobantes(apisunat_document_id)
  WHERE apisunat_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guias_remision_apisunat_doc_id
  ON guias_remision(apisunat_document_id)
  WHERE apisunat_document_id IS NOT NULL;
