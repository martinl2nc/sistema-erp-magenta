'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cobrosService } from '@/services/cobros.service';
import type { RegistrarCobroPayload, CuentaBancaria, CuentasPorCobrarParams } from '@/services/cobros.service';
import { facturasKeys } from './useFacturas';

// ─── Query Key Factories ─────────────────────────────────────

export const cobrosKeys = {
  all: () => ['cobros'] as const,
  cuentasPorCobrar: (params?: CuentasPorCobrarParams) => [...cobrosKeys.all(), 'cuentas-por-cobrar', params] as const,
  kpis: () => [...cobrosKeys.all(), 'kpis'] as const,
  historial: (comprobanteId: string) => [...cobrosKeys.all(), 'historial', comprobanteId] as const,
};

export const metodosPagoKeys = {
  all: () => ['metodos-pago'] as const,
};

export const cuentasBancariasKeys = {
  all: () => ['cuentas-bancarias'] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────

export function useCuentasPorCobrar(params?: CuentasPorCobrarParams) {
  return useQuery({
    queryKey: cobrosKeys.cuentasPorCobrar(params),
    queryFn: () => cobrosService.getCuentasPorCobrar(params),
    placeholderData: (prev) => prev,
  });
}

export function useKpisCuentasPorCobrar() {
  return useQuery({
    queryKey: cobrosKeys.kpis(),
    queryFn: () => cobrosService.getCuentasPorCobrarKpis(),
    staleTime: 30 * 1000,
  });
}

/**
 * Fetches the payment history for a specific comprobante.
 * Only enabled when a comprobanteId is provided.
 */
export function useHistorialCobros(comprobanteId?: string) {
  return useQuery({
    queryKey: cobrosKeys.historial(comprobanteId!),
    queryFn: () => cobrosService.getHistorialCobros(comprobanteId!),
    enabled: !!comprobanteId,
  });
}

/**
 * Fetches active payment methods for the dropdown.
 */
export function useMetodosPago() {
  return useQuery({
    queryKey: metodosPagoKeys.all(),
    queryFn: () => cobrosService.getMetodosPago(),
    staleTime: 5 * 60 * 1000, // 5 min — catalog data rarely changes
  });
}

/**
 * Fetches active bank accounts for the dropdown.
 */
export function useCuentasBancarias() {
  return useQuery({
    queryKey: cuentasBancariasKeys.all(),
    queryFn: () => cobrosService.getCuentasBancarias(),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────

/**
 * Registers a payment via the atomic RPC.
 * On success, invalidates cobros AND facturas lists
 * so estado_pago is reflected across modules.
 */
export function useRegistrarCobro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegistrarCobroPayload) => cobrosService.registrarCobro(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cobrosKeys.all() });
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
    },
  });
}

/**
 * Creates a new bank account.
 * Invalidates the bank accounts cache.
 */
export function useCreateCuentaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuenta: Omit<CuentaBancaria, 'id' | 'created_at' | 'activo'>) =>
      cobrosService.createCuentaBancaria(cuenta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cuentasBancariasKeys.all() });
    },
  });
}

/**
 * Updates a bank account.
 * Invalidates the bank accounts cache.
 */
export function useUpdateCuentaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cuenta }: { id: string, cuenta: Partial<Omit<CuentaBancaria, 'id' | 'created_at' | 'activo' | '_tiene_pagos'>> }) =>
      cobrosService.updateCuentaBancaria(id, cuenta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cuentasBancariasKeys.all() });
    },
  });
}

/**
 * Soft-deletes a bank account (sets activo = false).
 * Invalidates the bank accounts cache.
 */
export function useDeleteCuentaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cobrosService.deleteCuentaBancaria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cuentasBancariasKeys.all() });
    },
  });
}
