'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprasService } from '@/services/compras.service';
import type { ComprasListParams, PaginatedCompras, RegistrarCompraPayload, RegistrarCompraCompletoPayload, EditarComprobantePayload, EditarCompraCompletoPayload, KpisCompras } from '@/services/compras.service';

// ─── Query Key Factories ─────────────────────────────────────

export const comprasKeys = {
  all:      ()                         => ['compras'] as const,
  lists:    ()                         => [...comprasKeys.all(), 'list'] as const,
  list:     (params?: ComprasListParams) => [...comprasKeys.lists(), params] as const,
  detail:   (id: string)               => [...comprasKeys.all(), 'detail', id] as const,
  detalles: (id: string)               => [...comprasKeys.all(), 'detalles', id] as const,
};

export const categoriasGastoKeys = {
  all: () => ['categorias-gasto'] as const,
};

export const kpisComprasKeys = {
  all: () => ['compras-kpis'] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────

export function useCompras(params?: ComprasListParams, initialData?: PaginatedCompras) {
  return useQuery({
    queryKey: comprasKeys.list(params),
    queryFn:  () => comprasService.getCompras(params),
    placeholderData: (prev) => prev,
    initialData,
  });
}

export function useCompraById(id?: string) {
  return useQuery({
    queryKey: comprasKeys.detail(id!),
    queryFn:  () => comprasService.getCompraById(id!),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetallesCompra(id?: string, isOpen: boolean = false) {
  return useQuery({
    queryKey: comprasKeys.detalles(id ?? ''),
    queryFn:  () => comprasService.getDetallesCompra(id!),
    enabled:  !!id && isOpen,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoriasGasto() {
  return useQuery({
    queryKey: categoriasGastoKeys.all(),
    queryFn:  () => comprasService.getCategorias(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useKpisCompras(initialData?: KpisCompras) {
  return useQuery({
    queryKey: kpisComprasKeys.all(),
    queryFn:  () => comprasService.getKpisCompras(),
    staleTime: 2 * 60 * 1000,
    initialData,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────

export function useRegistrarCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegistrarCompraPayload) => comprasService.registrarCompra(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: kpisComprasKeys.all() });
    },
  });
}

export function useRegistrarCompraCompleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegistrarCompraCompletoPayload) => comprasService.registrarCompraCompleto(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: kpisComprasKeys.all() });
    },
  });
}

export function useEditarCompra(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditarComprobantePayload) => comprasService.editarComprobante(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.detail(id) });
    },
  });
}

export function useEditarCompraCompleto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditarCompraCompletoPayload) => comprasService.editarCompraCompleto(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: kpisComprasKeys.all() });
    },
  });
}
