'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasService } from '@/services/facturas.service';
import { configuracionSeriesService } from '@/services/configuracionSeries.service';
import type { EmitirComprobantePayload, EnviarSunatResponse, ComprobanteExternoPayload, FacturasListParams } from '@/services/facturas.service';
import { pedidosKeys } from './usePedidos';

export const facturasKeys = {
  all: () => ['comprobantes'] as const,
  lists: () => [...facturasKeys.all(), 'list'] as const,
  list: (params?: FacturasListParams) => [...facturasKeys.lists(), params] as const,
};

export const seriesKeys = {
  all: () => ['series'] as const,
  byTipoDoc: (codigo: string) => [...seriesKeys.all(), 'byTipoDoc', codigo] as const,
};

export function useSerieByTipoDoc(tipoDocCodigo: string, enabled = true) {
  return useQuery({
    queryKey: seriesKeys.byTipoDoc(tipoDocCodigo),
    queryFn: () => configuracionSeriesService.getSerieByTipoDoc(tipoDocCodigo),
    enabled: !!tipoDocCodigo && enabled,
  });
}

export function useFacturasList(params?: FacturasListParams) {
  return useQuery({
    queryKey: facturasKeys.list(params),
    queryFn: () => facturasService.getFacturas(params),
    placeholderData: (prev) => prev,
  });
}

export function useEmitirComprobante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmitirComprobantePayload) => facturasService.emitirComprobante(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.all() });
    },
  });
}

export function useCreateNotaCredito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: facturasService.createNotaCredito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.all() });
    },
  });
}

export function useActualizarComprobanteExterno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, files }: { id: string; payload: ComprobanteExternoPayload; files: { pdf?: File; xml?: File } }) =>
      facturasService.actualizarComprobanteExterno(id, payload, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
    },
  });
}

export function useRegistrarComprobanteExterno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, files }: { payload: ComprobanteExternoPayload; files: { pdf: File; xml: File } }) =>
      facturasService.registrarComprobanteExterno(payload, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
    },
  });
}

export function useEnviarASunat() {
  const queryClient = useQueryClient();
  return useMutation<EnviarSunatResponse, Error, string>({
    mutationFn: (comprobanteId: string) => facturasService.enviarASunat(comprobanteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.all() });
    },
  });
}

