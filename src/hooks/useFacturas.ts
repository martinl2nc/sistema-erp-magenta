'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasService } from '@/services/facturas.service';
import { configuracionSeriesService } from '@/services/configuracionSeries.service';
import type { EmitirComprobantePayload, EnviarSunatResponse, ComprobanteExternoPayload } from '@/services/facturas.service';
import { pedidosKeys } from './usePedidos';

export const facturasKeys = {
  all: () => ['comprobantes'] as const,
  list: () => [...facturasKeys.all(), 'list'] as const,
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
      queryClient.invalidateQueries({ queryKey: pedidosKeys.all() });
    },
  });
}

export function useCreateNotaCredito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: facturasService.createNotaCredito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
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
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
    },
  });
}

export function useRegistrarComprobanteExterno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, files }: { payload: ComprobanteExternoPayload; files: { pdf: File; xml: File } }) =>
      facturasService.registrarComprobanteExterno(payload, files),
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
      queryClient.invalidateQueries({ queryKey: pedidosKeys.all() });
    },
  });
}

