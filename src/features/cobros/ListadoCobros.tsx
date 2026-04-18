'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAllCobros, useMetodosPago, useCuentasBancarias, useAnularCobro } from '@/hooks/useCobros';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate as formatDateUtil, getClientDisplayName } from '@/utils/formatters';
import type { CobroListado } from '@/services/cobros.service';

// ─── Date preset helpers ──────────────────────────────────────

type DatePreset = 'hoy' | 'semana' | 'mes' | 'custom';

function getPresetRange(preset: DatePreset): { desde: string; hasta: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'hoy') {
    const s = fmt(today);
    return { desde: s, hasta: s };
  }
  if (preset === 'semana') {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { desde: fmt(monday), hasta: fmt(today) };
  }
  if (preset === 'mes') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { desde: fmt(first), hasta: fmt(today) };
  }
  return { desde: '', hasta: '' };
}

// ─── Método de pago icons ─────────────────────────────────────

const METODO_ICONS: Record<string, string> = {
  EFECTIVO:     'solar:hand-money-linear',
  TRANSFERENCIA:'solar:transfer-horizontal-linear',
  YAPE:         'solar:smartphone-linear',
  PLIN:         'solar:smartphone-linear',
  CHEQUE:       'solar:checklist-minimalistic-linear',
  DETRACCION:   'solar:bill-check-linear',
};

function getMetodoIcon(codigo: string): string {
  return METODO_ICONS[codigo.toUpperCase()] ?? 'solar:card-linear';
}

// ─── Anulación inline ─────────────────────────────────────────

interface AnulacionPanelProps {
  cobroId: string;
  comprobanteId: string;
  onClose: () => void;
}

function AnulacionPanel({ cobroId, comprobanteId, onClose }: AnulacionPanelProps) {
  const [motivo, setMotivo] = useState('');
  const { user } = useAuth();
  const { mutateAsync: anularCobro, isPending } = useAnularCobro(comprobanteId);

  const handleConfirm = async () => {
    if (!motivo.trim()) { toast.error('Ingresá un motivo para la anulación.'); return; }
    try {
      await anularCobro({ cobro_id: cobroId, anulado_por: user!.id, motivo });
      toast.success('Cobro anulado correctamente.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular cobro');
    }
  };

  return (
    <div className="mt-2 border border-red-500/20 rounded-md p-3 space-y-2 bg-red-500/5">
      <p className="text-xs text-red-400 font-medium">¿Confirmar anulación?</p>
      <input
        type="text"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className="w-full bg-[#181B21] border border-red-500/30 rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-red-500/50"
      />
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {isPending ? 'Anulando...' : 'Confirmar'}
        </button>
        <button onClick={onClose} className="flex-1 text-[#94A3B8] hover:text-[#E2E8F0] text-xs py-1.5 rounded-md transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function ListadoCobros() {
  const { role } = useAuth();

  const [preset, setPreset] = useState<DatePreset>('mes');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('');
  const [anulando, setAnulando] = useState<string | null>(null);

  const dateRange = preset === 'custom'
    ? { desde: customDesde, hasta: customHasta }
    : getPresetRange(preset);

  const { data: cobros = [], isLoading, isError, error } = useAllCobros({
    fechaDesde:       dateRange.desde || undefined,
    fechaHasta:       dateRange.hasta || undefined,
    cuentaBancariaId: cuentaFilter   || undefined,
    metodoPagoCodigo: metodoFilter   || undefined,
  });

  const { data: metodos = [] } = useMetodosPago();
  const { data: cuentas = [] } = useCuentasBancarias();

  const totales = useMemo(() => {
    const vigentes = cobros.filter((c) => !c.anulado);
    return {
      count: vigentes.length,
      monto: vigentes.reduce((s, c) => s + c.monto_cobrado, 0),
    };
  }, [cobros]);

  const getCliente = (c: CobroListado) => {
    const cl = c.comprobantes?.clientes;
    if (!cl) return '—';
    return getClientDisplayName({
      razon_social: cl.razon_social,
      nombres_contacto: cl.nombres_contacto,
      apellidos_contacto: cl.apellidos_contacto,
    }) || '—';
  };

  const formatDate = (d: string) => formatDateUtil(new Date(d));

  const PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Mes actual' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cobranzas"
            className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
          >
            <iconify-icon icon="solar:arrow-left-linear" class="text-xl"></iconify-icon>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Transacciones</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">Listado general de cobros — conciliación bancaria</p>
          </div>
        </div>

        {/* Totales */}
        {!isLoading && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Cobros vigentes</p>
              <p className="font-semibold text-[#E2E8F0]">{totales.count}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Total</p>
              <p className="font-bold text-[#10B981]">{formatCurrency(totales.monto)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 space-y-4">
        {/* Presets de fecha */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                preset === key
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#0F1115] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#334155]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {preset === 'custom' && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8] shrink-0">Desde</label>
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="bg-[#0F1115] border border-[#334155] rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#94A3B8] shrink-0">Hasta</label>
              <input
                type="date"
                value={customHasta}
                onChange={(e) => setCustomHasta(e.target.value)}
                className="bg-[#0F1115] border border-[#334155] rounded-md py-1.5 px-3 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
          </div>
        )}

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select
              value={cuentaFilter}
              onChange={(e) => setCuentaFilter(e.target.value)}
              className="appearance-none bg-[#0F1115] border border-[#334155] rounded-md py-1.5 pl-3 pr-8 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
            >
              <option value="">Todas las cuentas</option>
              {cuentas.map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.banco} — {cb.numero_cuenta}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
            </div>
          </div>

          <div className="relative">
            <select
              value={metodoFilter}
              onChange={(e) => setMetodoFilter(e.target.value)}
              className="appearance-none bg-[#0F1115] border border-[#334155] rounded-md py-1.5 pl-3 pr-8 text-xs text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
            >
              <option value="">Todos los métodos</option>
              {metodos.map((m) => (
                <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
              <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-12 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Cargando transacciones...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#EF4444]">Error al cargar transacciones</p>
            <p className="text-xs text-[#94A3B8]">{(error as Error)?.message}</p>
          </div>
        )}

        {!isLoading && !isError && cobros.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <iconify-icon icon="solar:bill-list-linear" class="text-4xl text-[#334155]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">No hay cobros para el período seleccionado.</p>
          </div>
        )}

        {!isLoading && !isError && cobros.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Comprobante</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Método</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Cuenta</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Nro. Op.</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Registrado por</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/50">
                {cobros.map((cobro) => (
                  <tr
                    key={cobro.id}
                    className={`transition-colors ${
                      cobro.anulado
                        ? 'opacity-50 bg-red-500/5'
                        : 'hover:bg-[#0F1115]/60'
                    }`}
                  >
                    <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap text-xs">
                      {formatDate(cobro.fecha_pago)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-[#3B82F6]">
                        {cobro.comprobantes?.serie_numero ?? '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-xs text-[#E2E8F0] truncate block" title={getCliente(cobro)}>
                        {getCliente(cobro)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#E2E8F0]">
                        <iconify-icon
                          icon={getMetodoIcon(cobro.metodo_pago_codigo)}
                          class="text-sm text-[#94A3B8] shrink-0"
                        ></iconify-icon>
                        {cobro.cat_metodos_pago?.descripcion ?? cobro.metodo_pago_codigo}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                      {cobro.cuentas_bancarias_empresa
                        ? `${cobro.cuentas_bancarias_empresa.banco} — ${cobro.cuentas_bancarias_empresa.numero_cuenta}`
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">
                      {cobro.referencia_operacion ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`text-sm font-bold ${cobro.anulado ? 'line-through text-[#94A3B8]' : 'text-[#10B981]'}`}>
                        {formatCurrency(cobro.monto_cobrado)}
                      </span>
                      {cobro.anulado && (
                        <span className="ml-2 text-[10px] font-bold bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">
                          ANULADO
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-[#94A3B8]">
                      {cobro.perfiles_usuario?.nombre ?? '—'}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {cobro.comprobante_img_url && (
                          <a
                            href={cobro.comprobante_img_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver voucher"
                            className="text-[#3B82F6] hover:text-blue-400 transition-colors"
                          >
                            <iconify-icon icon="solar:gallery-linear" class="text-base"></iconify-icon>
                          </a>
                        )}
                        {role === 'admin' && !cobro.anulado && (
                          <button
                            onClick={() => setAnulando(anulando === cobro.id ? null : cobro.id)}
                            title="Anular cobro"
                            className="text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            <iconify-icon icon="solar:trash-bin-minimalistic-linear" class="text-base"></iconify-icon>
                          </button>
                        )}
                      </div>
                      {anulando === cobro.id && (
                        <AnulacionPanel
                          cobroId={cobro.id}
                          comprobanteId={cobro.comprobante_id}
                          onClose={() => setAnulando(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
