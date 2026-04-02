'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasService } from '@/services/facturas.service';
import type { EmitirComprobantePayload, EnviarSunatResponse } from '@/services/facturas.service';

export const facturasKeys = {
  all: ['comprobantes'] as const,
  list: () => [...facturasKeys.all, 'list'] as const,
};

export function useFacturasList() {
  return useQuery({
    queryKey: facturasKeys.list(),
    queryFn: facturasService.getFacturas,
  });
}

export function useEmitirComprobante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmitirComprobantePayload) => facturasService.emitirComprobante(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useCreateNotaCredito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: facturasService.createNotaCredito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
    },
  });
}

export function useEnviarASunat() {
  const queryClient = useQueryClient();
  return useMutation<EnviarSunatResponse, Error, string>({
    mutationFn: (comprobanteId: string) => facturasService.enviarASunat(comprobanteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

