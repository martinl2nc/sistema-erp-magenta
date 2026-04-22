'use client';

import Link from 'next/link';
import { useKpisCompras } from '@/hooks/useCompras';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import type { KpisCompras } from '@/services/compras.service';

interface Props {
  initialKpis?: KpisCompras;
}

export default function ComprasDashboard({ initialKpis }: Props) {
  const { role } = useAuth();
  const { data: kpis, isLoading } = useKpisCompras(initialKpis);

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <iconify-icon icon="solar:lock-linear" class="text-5xl text-[#334155]"></iconify-icon>
        <p className="text-sm text-[#94A3B8]">Solo los administradores pueden acceder al dashboard de compras.</p>
      </div>
    );
  }

  const mes = formatMonthYear(new Date());
  const totalPendientes = (kpis?.countPendientes ?? 0) + (kpis?.countParciales ?? 0);

  return (
    <div className="max-w-7xl w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E2E8F0]">Dashboard de Compras</h1>
        <p className="text-sm text-[#94A3B8] mt-1 capitalize">{mes}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-5">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Compras del Mes</p>
          {isLoading
            ? <div className="h-7 bg-[#334155] rounded animate-pulse w-24 mb-1"></div>
            : <p className="text-2xl font-bold text-[#E2E8F0]">{formatCurrency(kpis?.totalMes ?? 0)}</p>
          }
          <p className="text-xs text-[#94A3B8] mt-1">Total facturado recibido</p>
        </div>

        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-5">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Crédito Fiscal IGV</p>
          {isLoading
            ? <div className="h-7 bg-[#334155] rounded animate-pulse w-24 mb-1"></div>
            : <p className="text-2xl font-bold text-[#3B82F6]">{formatCurrency(kpis?.igvCreditoFiscalMes ?? 0)}</p>
          }
          <p className="text-xs text-[#94A3B8] mt-1">IGV a favor del mes</p>
        </div>

        <div className="bg-[#181B21] border border-[#334155] rounded-lg p-5">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Cuentas por Pagar</p>
          {isLoading
            ? <div className="h-7 bg-[#334155] rounded animate-pulse w-24 mb-1"></div>
            : <p className="text-2xl font-bold text-yellow-400">{formatCurrency(kpis?.totalCxP ?? 0)}</p>
          }
          <p className="text-xs text-[#94A3B8] mt-1">
            {kpis
              ? `${totalPendientes} comprobante${totalPendientes !== 1 ? 's' : ''} pendiente${totalPendientes !== 1 ? 's' : ''}`
              : '—'}
          </p>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/compras/facturacion"
          className="group bg-[#181B21] border border-[#334155] rounded-lg p-5 hover:border-[#3B82F6]/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <iconify-icon icon="solar:bill-list-linear" class="text-2xl text-[#3B82F6]"></iconify-icon>
            <h2 className="text-base font-semibold text-[#E2E8F0] group-hover:text-[#3B82F6] transition-colors">Facturación</h2>
          </div>
          <p className="text-sm text-[#94A3B8]">Registro de comprobantes recibidos de proveedores.</p>
        </Link>

        <Link
          href="/compras/pagos"
          className="group bg-[#181B21] border border-[#334155] rounded-lg p-5 hover:border-[#10B981]/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <iconify-icon icon="solar:wallet-money-linear" class="text-2xl text-[#10B981]"></iconify-icon>
            <h2 className="text-base font-semibold text-[#E2E8F0] group-hover:text-[#10B981] transition-colors">Cuentas por Pagar</h2>
          </div>
          <p className="text-sm text-[#94A3B8]">
            {kpis && totalPendientes > 0
              ? `${totalPendientes} comprobante${totalPendientes !== 1 ? 's' : ''} pendiente${totalPendientes !== 1 ? 's' : ''} de pago.`
              : 'Sin comprobantes pendientes de pago.'}
          </p>
        </Link>
      </div>
    </div>
  );
}
