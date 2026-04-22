'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useEditarCompra, useCategoriasGasto } from '@/hooks/useCompras';
import type { ComprobanteCompra } from '@/services/compras.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobante: ComprobanteCompra | null;
  onSuccess: () => void;
}

export default function EditarCompraModal({ isOpen, onClose, comprobante, onSuccess }: Props) {
  const [notas,            setNotas]            = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [categoriaId,      setCategoriaId]      = useState('');
  const [pdf,              setPdf]              = useState<File | null>(null);
  const [xml,              setXml]              = useState<File | null>(null);

  const pdfRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);

  const { data: categorias = [] } = useCategoriasGasto();
  const { mutateAsync: editar, isPending } = useEditarCompra(comprobante?.id ?? '');

  useEffect(() => {
    if (!isOpen || !comprobante) return;
    setNotas(comprobante.notas ?? '');
    setFechaVencimiento(comprobante.fecha_vencimiento ?? '');
    setCategoriaId(comprobante.cat_categorias_gasto?.id ?? '');
    setPdf(null);
    setXml(null);
  }, [isOpen, comprobante]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setter(file);
  };

  const handleSubmit = async () => {
    if (!comprobante) return;
    try {
      await editar({
        notas:             notas.trim() || null,
        fecha_vencimiento: fechaVencimiento || null,
        categoria_gasto_id: categoriaId || null,
        archivoPdf:        pdf ?? undefined,
        archivoXml:        xml ?? undefined,
      });
      toast.success('Comprobante actualizado correctamente.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el comprobante.');
    }
  };

  if (!isOpen || !comprobante) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      <div className="relative bg-[#181B21] border border-[#334155] rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#E2E8F0]">Editar Comprobante</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{comprobante.serie_numero}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1">
            <iconify-icon icon="solar:close-linear" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Archivos */}
          <div>
            <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">Archivos</p>
            <div className="space-y-3">
              {/* PDF */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#94A3B8] mb-1">PDF</p>
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md px-3 py-2">
                    <iconify-icon icon="solar:file-text-linear" class="text-base text-[#94A3B8] shrink-0"></iconify-icon>
                    <span className="text-xs text-[#94A3B8] truncate flex-1">
                      {pdf ? pdf.name : (comprobante.archivo_pdf_url ? 'Archivo existente' : 'Sin archivo')}
                    </span>
                    {comprobante.archivo_pdf_url && !pdf && (
                      <a
                        href={comprobante.archivo_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#3B82F6] hover:text-blue-400 shrink-0"
                      >
                        Ver
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pdfRef.current?.click()}
                  className="mt-5 border border-[#334155] text-[#94A3B8] text-xs font-medium px-3 py-2 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors shrink-0"
                >
                  {comprobante.archivo_pdf_url ? 'Reemplazar' : 'Subir'}
                </button>
                <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, setPdf)} />
              </div>

              {/* XML */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#94A3B8] mb-1">XML</p>
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-[#334155] rounded-md px-3 py-2">
                    <iconify-icon icon="solar:code-square-linear" class="text-base text-[#94A3B8] shrink-0"></iconify-icon>
                    <span className="text-xs text-[#94A3B8] truncate flex-1">
                      {xml ? xml.name : (comprobante.archivo_xml_url ? 'Archivo existente' : 'Sin archivo')}
                    </span>
                    {comprobante.archivo_xml_url && !xml && (
                      <a
                        href={comprobante.archivo_xml_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#3B82F6] hover:text-blue-400 shrink-0"
                      >
                        Ver
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => xmlRef.current?.click()}
                  className="mt-5 border border-[#334155] text-[#94A3B8] text-xs font-medium px-3 py-2 rounded-md hover:bg-[#334155]/50 hover:text-[#E2E8F0] transition-colors shrink-0"
                >
                  {comprobante.archivo_xml_url ? 'Reemplazar' : 'Subir'}
                </button>
                <input ref={xmlRef} type="file" accept=".xml" className="hidden" onChange={(e) => handleFileChange(e, setXml)} />
              </div>
            </div>
          </div>

          <div className="border-t border-[#334155]"></div>

          {/* Metadatos */}
          <div>
            <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">Información adicional</p>
            <div className="space-y-3">
              {/* Categoría */}
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Categoría de gasto</label>
                <div className="relative">
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 pl-3 pr-8 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-[#94A3B8]">
                    <iconify-icon icon="solar:alt-arrow-down-linear" class="text-base"></iconify-icon>
                  </div>
                </div>
              </div>

              {/* Fecha vencimiento */}
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Notas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Observaciones sobre el comprobante..."
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-md py-2 px-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#334155] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <iconify-icon icon="solar:spinner-linear" class="animate-spin text-base"></iconify-icon>}
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
