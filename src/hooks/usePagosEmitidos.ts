'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pagosEmitidosService } from '@/services/pagos-emitidos.service';
import type {
  RegistrarPagoEmitidoPayload,
  AnularPagoEmitidoPayload,
  AllPagosEmitidosParams,
} from '@/services/pagos-emitidos.service';
import { comprasKeys } from '@/hooks/useCompras';

// ─── Query Key Factories ─────────────────────────────────────

export const pagosEmitidosKeys = {
  all:        ()                            => ['pagos-emitidos'] as const,
  historial:  (id: string)                  => [...pagosEmitidosKeys.all(), 'historial', id] as const,
  lists:      ()                            => [...pagosEmitidosKeys.all(), 'list'] as const,
  list:       (params?: AllPagosEmitidosParams) => [...pagosEmitidosKeys.lists(), params] as const,
  totales:    (params?: Omit<AllPagosEmitidosParams, 'page' | 'pageSize'>) => [...pagosEmitidosKeys.all(), 'totales', params] as const,
  agingReport: ()                           => [...pagosEmitidosKeys.all(), 'aging-report'] as const,
  agingDetalle: (id: string)                => [...pagosEmitidosKeys.all(), 'aging-detalle', id] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────

export function useAllPagosEmitidos(params?: AllPagosEmitidosParams) {
  return useQuery({
    queryKey: pagosEmitidosKeys.list(params),
    queryFn:  () => pagosEmitidosService.getAllPagosEmitidos(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllPagosEmitidosTotales(params?: Omit<AllPagosEmitidosParams, 'page' | 'pageSize'>) {
  return useQuery({
    queryKey: pagosEmitidosKeys.totales(params),
    queryFn:  () => pagosEmitidosService.getAllPagosEmitidosTotales(params),
  });
}

export function useAgingReportCompras() {
  return useQuery({
    queryKey: pagosEmitidosKeys.agingReport(),
    queryFn:  () => pagosEmitidosService.getAgingReportCompras(),
  });
}

export function useAgingDetalleCompras(proveedorId?: string) {
  return useQuery({
    queryKey: pagosEmitidosKeys.agingDetalle(proveedorId ?? ''),
    queryFn:  () => pagosEmitidosService.getAgingDetalleCompras(proveedorId!),
    enabled:  !!proveedorId,
  });
}

export function useHistorialPagosEmitidos(id?: string) {
  return useQuery({
    queryKey: pagosEmitidosKeys.historial(id ?? ''),
    queryFn:  () => pagosEmitidosService.getHistorialPagosEmitidos(id!),
    enabled:  !!id,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────

export function useRegistrarPagoEmitido(comprobanteCompraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegistrarPagoEmitidoPayload) =>
      pagosEmitidosService.registrarPagoEmitido(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.historial(comprobanteCompraId) });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.agingReport() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.detail(comprobanteCompraId) });
    },
  });
}

export function useAnularPagoEmitido(comprobanteCompraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnularPagoEmitidoPayload) =>
      pagosEmitidosService.anularPagoEmitido(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.historial(comprobanteCompraId) });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.agingReport() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.detail(comprobanteCompraId) });
    },
  });
}

interface RegistrarPagoCompletoPayload extends RegistrarPagoEmitidoPayload {
  voucher?: File | null;
}

export function useRegistrarPagoCompleto(comprobanteCompraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ voucher, ...payload }: RegistrarPagoCompletoPayload) =>
      pagosEmitidosService.registrarPagoCompleto(payload, voucher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.historial(comprobanteCompraId) });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pagosEmitidosKeys.agingReport() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.detail(comprobanteCompraId) });
    },
  });
}
