'use client';

import UbigeoSelector from '@/components/ubigeo/UbigeoSelector';
import type { CompanyConfig } from '@/services/companyConfig.service';
import type { Client } from '@/services/clients.service';
import type { PedidoLinea } from '@/services/pedidos.service';
import type { EmitirGuiaRemisionResult } from '@/services/guiasRemision.service';
import { getClientDisplayName } from '@/utils/formatters';
import { useEmitirGuiaRemisionModalState } from './useEmitirGuiaRemisionModalState';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: CompanyConfig;
  cliente: Client;
  pedidoId?: string | null;
  pedidoLineas?: PedidoLinea[];
  comprobanteSerieNumero?: string | null;
  comprobanteTipoDoc?: string | null;
  onSuccess?: (result: EmitirGuiaRemisionResult) => void;
}

const inputClass =
  'block w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow';
const labelClass = 'block text-xs font-medium text-[#94A3B8] mb-1.5';
const selectClass =
  'appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-shadow cursor-pointer';

export default function EmitirGuiaRemisionModal(props: Props) {
  const { isOpen, onClose, cliente } = props;

  const {
    motivos,
    emitirMutation,
    step,
    errorMsg,
    emitResult,
    fechaInicioTraslado, setFechaInicioTraslado,
    motivoCodigo, setMotivoCodigo,
    motivoDesc, setMotivoDesc,
    modalidad, setModalidad,
    pesoBruto, setPesoBruto,
    numeroBultos, setNumeroBultos,
    observacion, setObservacion,
    partida, setPartida,
    llegada, setLlegada,
    transpNumDoc, setTranspNumDoc,
    transpRazonSocial, setTranspRazonSocial,
    transpPlaca, setTranspPlaca,
    conductorDoc, setConductorDoc,
    vehiculoPlaca, setVehiculoPlaca,
    vehiculoConductorDoc, setVehiculoConductorDoc,
    vehiculoConductorNombres, setVehiculoConductorNombres,
    tipoDocRel, setTipoDocRel,
    nroDocRel, setNroDocRel,
    conductorNombres, setConductorNombres,
    lineas,
    requiereDescLibre,
    handlePartidaUbigeo,
    handleLlegadaUbigeo,
    handleNextStep,
    handleEmitir,
    handleBack,
    addLinea,
    removeLinea,
    updateLinea,
  } = useEmitirGuiaRemisionModalState(props);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#181B21] border border-[#334155] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#E2E8F0]">Emitir Guía de Remisión</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {getClientDisplayName(cliente)} •{' '}
              {cliente.numero_documento}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={emitirMutation.isPending}
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Step indicator */}
        {!emitResult && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-[#334155] shrink-0">
            {[
              { n: 1, label: 'Datos del traslado' },
              { n: 2, label: 'Bienes a trasladar' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s.n
                      ? 'bg-[#3B82F6] text-white'
                      : step > s.n
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#334155] text-[#94A3B8]'
                  }`}
                >
                  {step > s.n ? (
                    <iconify-icon icon="solar:check-linear" class="text-xs"></iconify-icon>
                  ) : (
                    s.n
                  )}
                </div>
                <span className={`text-xs ${step >= s.n ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`}>
                  {s.label}
                </span>
                {s.n < 2 && <div className="w-8 h-px bg-[#334155] mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Success state */}
          {emitResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto">
                <iconify-icon icon="solar:check-circle-bold" class="text-4xl text-[#10B981]"></iconify-icon>
              </div>
              <div>
                <p className="text-lg font-semibold text-[#E2E8F0]">Guía Emitida</p>
                <p className="text-2xl font-mono font-bold text-[#3B82F6] mt-1">{emitResult.serie_numero}</p>
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {emitResult.enlace_pdf && (
                  <a
                    href={emitResult.enlace_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-lg text-sm hover:bg-[#EF4444]/20 transition-colors"
                  >
                    <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                    PDF
                  </a>
                )}
                {emitResult.enlace_xml && (
                  <a
                    href={emitResult.enlace_xml}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#334155]/50 border border-[#334155] text-[#94A3B8] rounded-lg text-sm hover:bg-[#334155] transition-colors"
                  >
                    <iconify-icon icon="solar:file-download-linear" class="text-base"></iconify-icon>
                    XML
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {!emitResult && errorMsg && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg p-3 text-[#EF4444] text-sm">
              {errorMsg}
            </div>
          )}

          {/* Step 1 */}
          {!emitResult && step === 1 && (
            <div className="space-y-5">
              {/* Fecha + Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha inicio traslado *</label>
                  <input
                    type="date"
                    value={fechaInicioTraslado}
                    onChange={e => setFechaInicioTraslado(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Motivo de traslado *</label>
                  <div className="relative">
                    <select
                      value={motivoCodigo}
                      onChange={e => setMotivoCodigo(e.target.value)}
                      className={selectClass}
                      title="Motivo de traslado"
                    >
                      {motivos.map(m => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.codigo} — {m.descripcion}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
                      <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
                    </div>
                  </div>
                </div>
              </div>

              {requiereDescLibre && (
                <div>
                  <label className={labelClass}>Descripción del motivo *</label>
                  <input
                    type="text"
                    value={motivoDesc}
                    onChange={e => setMotivoDesc(e.target.value)}
                    placeholder="Describí el motivo del traslado"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Documento Relacionado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0F1115] border border-[#334155] rounded-lg p-4">
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-[#94A3B8] mb-2">Documento Relacionado (Obligatorio para Venta)</p>
                </div>
                <div>
                  <label className={labelClass}>Tipo Doc. Relacionado</label>
                  <div className="relative">
                    <select
                      value={tipoDocRel}
                      onChange={e => setTipoDocRel(e.target.value)}
                      className={selectClass}
                    >
                      <option value="01">01 — Factura</option>
                      <option value="03">03 — Boleta</option>
                      <option value="02">02 — Liquidación de compra</option>
                      <option value="00">00 — Otros</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
                      <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Serie-Número Relacionado</label>
                  <input
                    type="text"
                    value={nroDocRel}
                    onChange={e => setNroDocRel(e.target.value.toUpperCase())}
                    placeholder="F001-123"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Modalidad */}
              <div>
                <label className={labelClass}>Modalidad de traslado *</label>
                <div className="flex gap-3">
                  {[
                    { v: '02', label: 'Transporte privado (vehículo propio)' },
                    { v: '01', label: 'Transporte público (tercero)' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setModalidad(opt.v as '01' | '02')}
                      className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        modalidad === opt.v
                          ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-[#3B82F6]'
                          : 'bg-[#0F1115] border-[#334155] text-[#94A3B8] hover:border-[#94A3B8]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transportista (modalidad 01) */}
              {modalidad === '01' && (
                <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-[#94A3B8]">Datos del transportista</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>RUC transportista *</label>
                      <input type="text" value={transpNumDoc} onChange={e => setTranspNumDoc(e.target.value)} placeholder="20123456789" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Razón social</label>
                      <input type="text" value={transpRazonSocial} onChange={e => setTranspRazonSocial(e.target.value)} placeholder="Empresa de transporte S.A.C." className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Placa del vehículo *</label>
                      <input type="text" value={transpPlaca} onChange={e => setTranspPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>DNI del conductor *</label>
                      <input type="text" value={conductorDoc} onChange={e => setConductorDoc(e.target.value)} placeholder="12345678" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nombres del conductor *</label>
                      <input type="text" value={conductorNombres} onChange={e => setConductorNombres(e.target.value)} placeholder="Juan Perez" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Vehículo propio (modalidad 02) */}
              {modalidad === '02' && (
                <div className="bg-[#0F1115] border border-[#334155] rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-[#94A3B8]">Datos del vehículo propio</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Placa del vehículo *</label>
                      <input type="text" value={vehiculoPlaca} onChange={e => setVehiculoPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>DNI del conductor *</label>
                      <input type="text" value={vehiculoConductorDoc} onChange={e => setVehiculoConductorDoc(e.target.value)} placeholder="12345678" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nombres del conductor *</label>
                      <input type="text" value={vehiculoConductorNombres} onChange={e => setVehiculoConductorNombres(e.target.value)} placeholder="Juan Perez" className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Dirección partida */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#E2E8F0]">Dirección de partida</p>
                <UbigeoSelector
                  value={partida.ubigueo || undefined}
                  onChange={handlePartidaUbigeo}
                  label="Ubigeo de partida *"
                />
                <div>
                  <label className={labelClass}>Dirección descriptiva *</label>
                  <input
                    type="text"
                    value={partida.direccion}
                    onChange={e => setPartida(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Av. Principal 123, Piso 2"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Dirección llegada */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#E2E8F0]">Dirección de llegada</p>
                <UbigeoSelector
                  value={llegada.ubigueo || undefined}
                  onChange={handleLlegadaUbigeo}
                  label="Ubigeo de llegada *"
                />
                <div>
                  <label className={labelClass}>Dirección descriptiva *</label>
                  <input
                    type="text"
                    value={llegada.direccion}
                    onChange={e => setLlegada(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle Los Álamos 456"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Peso + Bultos + Observación */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Peso bruto total (KGM) *</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={pesoBruto}
                    onChange={e => setPesoBruto(e.target.value)}
                    placeholder="0.000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Número de bultos</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={numeroBultos}
                    onChange={e => setNumeroBultos(e.target.value)}
                    placeholder="—"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Observación (opcional)</label>
                <input
                  type="text"
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  placeholder="Nota libre que aparecerá en el documento"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Bienes */}
          {!emitResult && step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#94A3B8]">
                  {lineas.length} {lineas.length === 1 ? 'bien' : 'bienes'} a trasladar
                </p>
                <button
                  type="button"
                  onClick={addLinea}
                  className="text-xs text-[#3B82F6] hover:text-blue-400 font-medium flex items-center gap-1"
                >
                  <iconify-icon icon="solar:add-circle-linear" class="text-sm"></iconify-icon>
                  Agregar bien
                </button>
              </div>

              <div className="space-y-2">
                {lineas.map((l, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0F1115] border border-[#334155] rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B] font-mono">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeLinea(idx)}
                        className="text-[#94A3B8] hover:text-red-400 transition-colors"
                        title="Quitar"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-linear" class="text-sm"></iconify-icon>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={l.descripcion}
                      onChange={e => updateLinea(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del bien *"
                      className={inputClass}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={l.cantidad}
                        onChange={e => updateLinea(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                        placeholder="Cantidad *"
                        className={inputClass}
                      />
                      <div className="relative">
                        <select
                          value={l.unidad_codigo}
                          onChange={e => updateLinea(idx, 'unidad_codigo', e.target.value)}
                          className={selectClass}
                          title="Unidad"
                        >
                          <option value="NIU">NIU (Unidad)</option>
                          <option value="KGM">KGM (Kilogramo)</option>
                          <option value="LTR">LTR (Litro)</option>
                          <option value="MTR">MTR (Metro)</option>
                          <option value="BX">BX (Caja)</option>
                          <option value="BG">BG (Bolsa)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
                          <iconify-icon icon="solar:alt-arrow-down-linear" class="text-xs"></iconify-icon>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={l.codigo_producto ?? ''}
                        onChange={e => updateLinea(idx, 'codigo_producto', e.target.value)}
                        placeholder="Código (opc.)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}

                {lineas.length === 0 && (
                  <div className="border border-dashed border-[#334155] rounded-lg p-8 text-center">
                    <iconify-icon icon="solar:box-linear" class="text-2xl text-[#334155] mb-2"></iconify-icon>
                    <p className="text-xs text-[#94A3B8]">No hay bienes. Agregá al menos uno.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!emitResult && (
          <div className="px-6 py-4 border-t border-[#334155] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={emitirMutation.isPending}
              className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors disabled:opacity-50"
            >
              {step === 1 ? 'Cancelar' : '← Volver'}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEmitir}
                disabled={emitirMutation.isPending}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {emitirMutation.isPending ? (
                  <>
                    <iconify-icon icon="line-md:loading-twotone-loop" class="text-base"></iconify-icon>
                    Emitiendo...
                  </>
                ) : (
                  <>
                    <iconify-icon icon="solar:document-add-linear" class="text-base"></iconify-icon>
                    Emitir Guía
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {emitResult && (
          <div className="px-6 py-4 border-t border-[#334155] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#334155]/50 hover:bg-[#334155] border border-[#334155] text-[#E2E8F0] text-sm font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
