'use client';

import React, { useState } from 'react';
import { useAgingReport, useAgingDetalle } from '@/hooks/useCobros';
import { formatCurrency, formatDate, getClientDisplayName, formatLongDate } from '@/utils/formatters';
import type { AgingDetalleRow, AgingReportRow } from '@/services/cobros.service';
import { ExportButton } from '@/components/ui/ExportButton';

// ─── Bucket configuration ────────────────────────────────────

const BUCKETS = [
  { key: 'por_vencer'    as const, label: 'Por Vencer',  color: 'text-[#10B981]',  headerColor: 'text-[#10B981]'  },
  { key: 'vencido_1_30'  as const, label: '1 - 30 días', color: 'text-yellow-400', headerColor: 'text-yellow-400' },
  { key: 'vencido_31_60' as const, label: '31 - 60 días',color: 'text-orange-400', headerColor: 'text-orange-400' },
  { key: 'vencido_61_90' as const, label: '61 - 90 días',color: 'text-red-400',    headerColor: 'text-red-400'    },
  { key: 'vencido_mas_90'as const, label: '+ 90 días',   color: 'text-red-500',    headerColor: 'text-red-500'    },
] as const;

type BucketKey = typeof BUCKETS[number]['key'];

const BUCKET_BADGE: Record<BucketKey, string> = {
  por_vencer:     'bg-[#10B981]/10 text-[#10B981]',
  vencido_1_30:   'bg-yellow-500/10 text-yellow-400',
  vencido_31_60:  'bg-orange-500/10 text-orange-400',
  vencido_61_90:  'bg-red-500/10 text-red-400',
  vencido_mas_90: 'bg-red-600/10 text-red-500',
};

const BUCKET_LABEL: Record<BucketKey, string> = {
  por_vencer:     'Por Vencer',
  vencido_1_30:   '1-30 días',
  vencido_31_60:  '31-60 días',
  vencido_61_90:  '61-90 días',
  vencido_mas_90: '+90 días',
};

// ─── Sub-table: per-comprobante detail ───────────────────────

function AgingDetalleRows({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useAgingDetalle(clienteId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="px-8 py-4 text-center text-sm text-[#94A3B8]">
          <span className="inline-flex items-center gap-2">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-[#3B82F6]"></iconify-icon>
            Cargando comprobantes...
          </span>
        </td>
      </tr>
    );
  }

  return (
    <>
      {/* Sub-header */}
      <tr className="bg-[#0F1115]/80">
        <td></td>
        <td className="pl-14 pr-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">Comprobante</td>
        <td className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">F. Pago</td>
        <td className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8] text-right">Total</td>
        <td className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8] text-right">Saldo</td>
        <td className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">Bucket</td>
        <td className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8] text-right">Días</td>
        <td></td>
      </tr>
      {(data ?? []).map((row: AgingDetalleRow) => (
        <tr key={row.comprobante_id} className="bg-[#0F1115]/50 border-b border-[#334155]/40 hover:bg-[#334155]/5">
          <td></td>
          <td className="pl-14 pr-4 py-2.5 text-sm font-medium text-[#E2E8F0]">{row.serie_numero}</td>
          <td className="px-4 py-2.5 text-sm text-[#94A3B8]">
            {row.fecha_vencimiento ? formatDate(row.fecha_vencimiento) : '—'}
          </td>
          <td className="px-4 py-2.5 text-sm text-right text-[#94A3B8]">{formatCurrency(row.total_facturado)}</td>
          <td className="px-4 py-2.5 text-sm text-right font-semibold text-yellow-400">{formatCurrency(row.saldo_pendiente)}</td>
          <td className="px-4 py-2.5">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${BUCKET_BADGE[row.bucket]}`}>
              {BUCKET_LABEL[row.bucket]}
            </span>
          </td>
          <td className="px-4 py-2.5 text-sm text-right text-[#94A3B8]">
            {row.dias_vencido <= 0
              ? <span className="text-[#10B981]">en {Math.abs(row.dias_vencido)}d</span>
              : <span>{row.dias_vencido}d</span>
            }
          </td>
          <td></td>
        </tr>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────

interface AgingReportProps {
  embedded?: boolean;
}

export default function AgingReport({ embedded = false }: AgingReportProps) {
  const { data: rows, isLoading, isError } = useAgingReport();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const totals = (rows ?? []).reduce(
    (acc, r) => ({
      deuda:          acc.deuda          + r.deuda_total,
      por_vencer:     acc.por_vencer     + r.por_vencer,
      vencido_1_30:   acc.vencido_1_30   + r.vencido_1_30,
      vencido_31_60:  acc.vencido_31_60  + r.vencido_31_60,
      vencido_61_90:  acc.vencido_61_90  + r.vencido_61_90,
      vencido_mas_90: acc.vencido_mas_90 + r.vencido_mas_90,
    }),
    { deuda: 0, por_vencer: 0, vencido_1_30: 0, vencido_31_60: 0, vencido_61_90: 0, vencido_mas_90: 0 }
  );

  const totalVencido = totals.vencido_1_30 + totals.vencido_31_60 + totals.vencido_61_90 + totals.vencido_mas_90;
  const pctVencido = totals.deuda > 0 ? (totalVencido / totals.deuda) * 100 : 0;

  const today = formatLongDate(new Date());

  return (
    <div className={embedded ? 'flex flex-col flex-1' : 'max-w-7xl w-full mx-auto flex flex-col'}>
      {/* Header — only when standalone */}
      {!embedded && (
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Antigüedad de Deuda</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Al {today}</p>
        </div>
        {!isLoading && !isError && (rows ?? []).length > 0 && (
          <div className="text-sm text-[#94A3B8] self-end sm:self-auto text-right">
            <span className="text-red-400 font-semibold">{pctVencido.toFixed(0)}%</span> de la deuda está vencida
          </div>
        )}
      </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end mb-3">
        <ExportButton
          getUrl={() => '/api/export/aging'}
          filename="aging_saldos.xlsx"
          label="Exportar Excel"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Deuda Total</p>
          <p className="text-lg font-bold text-[#E2E8F0]">{formatCurrency(totals.deuda)}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{(rows ?? []).length} cliente{(rows ?? []).length !== 1 ? 's' : ''}</p>
        </div>
        {BUCKETS.map(b => (
          <div key={b.key} className="bg-[#181B21] border border-[#334155] rounded-lg p-4">
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{b.label}</p>
            <p className={`text-lg font-bold ${b.color}`}>{formatCurrency(totals[b.key])}</p>
            {totals.deuda > 0 && (
              <p className="text-xs text-[#94A3B8] mt-1">
                {((totals[b.key] / totals.deuda) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#181B21] border border-[#334155] rounded-lg overflow-hidden shadow-sm">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-10 text-[#94A3B8] text-sm">
            <iconify-icon icon="solar:spinner-linear" class="animate-spin text-xl text-[#3B82F6]"></iconify-icon>
            Calculando antigüedad de deuda...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <iconify-icon icon="solar:danger-triangle-linear" class="text-3xl text-[#EF4444]"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">Error al cargar el reporte.</p>
          </div>
        )}

        {!isLoading && !isError && (rows ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <iconify-icon icon="solar:wallet-check-linear" class="text-5xl text-[#10B981]/40"></iconify-icon>
            <p className="text-sm text-[#94A3B8]">No hay deudas pendientes. ¡Todo al día!</p>
          </div>
        )}

        {!isLoading && !isError && (rows ?? []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#334155] bg-[#0F1115]">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">Cliente</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-[#94A3B8] uppercase text-right">Deuda Total</th>
                  {BUCKETS.map(b => (
                    <th key={b.key} className={`px-4 py-3 text-xs font-medium tracking-wider uppercase text-right ${b.headerColor}`}>
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155] bg-[#181B21]">
                {(rows ?? []).map((row: AgingReportRow) => {
                  const isExpanded = expandedIds.has(row.cliente_id);
                  const nombre = getClientDisplayName({
                    razon_social: row.razon_social,
                    nombres_contacto: row.nombres_contacto,
                    apellidos_contacto: row.apellidos_contacto,
                  });

                  return (
                    <React.Fragment key={row.cliente_id}>
                      <tr
                        onClick={() => toggle(row.cliente_id)}
                        className={`cursor-pointer hover:bg-[#334155]/10 transition-colors ${isExpanded ? 'bg-[#334155]/10' : ''}`}
                      >
                        <td className="w-10 px-4 py-4 text-center">
                          <iconify-icon
                            icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                            class="text-[#94A3B8] text-lg"
                          ></iconify-icon>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-[#E2E8F0]">{nombre}</p>
                          <p className="text-xs text-[#94A3B8]">
                            {row.count_comprobantes} comprobante{row.count_comprobantes !== 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-right text-[#E2E8F0]">
                          {formatCurrency(row.deuda_total)}
                        </td>
                        {BUCKETS.map(b => (
                          <td key={b.key} className={`px-4 py-4 text-sm text-right ${row[b.key] > 0 ? b.color : 'text-[#334155]'}`}>
                            {row[b.key] > 0 ? formatCurrency(row[b.key]) : '—'}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && <AgingDetalleRows clienteId={row.cliente_id} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#334155] bg-[#0F1115]">
                  <td></td>
                  <td className="px-4 py-3 text-xs font-bold text-[#94A3B8] uppercase">
                    Total — {(rows ?? []).length} cliente{(rows ?? []).length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-[#E2E8F0]">{formatCurrency(totals.deuda)}</td>
                  {BUCKETS.map(b => (
                    <td key={b.key} className={`px-4 py-3 text-sm font-bold text-right ${b.color}`}>
                      {formatCurrency(totals[b.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
