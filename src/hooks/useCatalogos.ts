'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogosService } from '@/services/catalogos.service';
import type { CatTipoNotaCredito } from '@/services/catalogos.service';

// Catálogos SUNAT son datos estáticos: se cargan una sola vez por sesión.
const CATALOG_OPTIONS = {
  staleTime: Infinity,   // nunca se marcan como stale
  gcTime: 1000 * 60 * 60 * 24, // 24h en cache
};

export const catalogosKeys = {
  all: () => ['catalogos'] as const,
  unidades: () => [...catalogosKeys.all(), 'unidades_medida'] as const,
  afectaciones: () => [...catalogosKeys.all(), 'afectacion_igv'] as const,
  tiposDocumento: () => [...catalogosKeys.all(), 'tipo_documento'] as const,
  tiposNotaCredito: () => [...catalogosKeys.all(), 'tipo_nota_credito'] as const,
  cargosDescuentos: () => [...catalogosKeys.all(), 'cargos_descuentos'] as const,
  tiposOperacion: () => [...catalogosKeys.all(), 'tipo_operacion'] as const,
  bienesDetraccion: () => [...catalogosKeys.all(), 'bien_servicio_detraccion'] as const,
};

export function useUnidadesMedida() {
  return useQuery({
    queryKey: catalogosKeys.unidades(),
    queryFn: catalogosService.getUnidadesMedida,
    ...CATALOG_OPTIONS,
  });
}

export function useAfectacionesIgv() {
  return useQuery({
    queryKey: catalogosKeys.afectaciones(),
    queryFn: catalogosService.getAfectacionesIgv,
    ...CATALOG_OPTIONS,
  });
}

export function useTiposDocumento() {
  return useQuery({
    queryKey: catalogosKeys.tiposDocumento(),
    queryFn: catalogosService.getTiposDocumento,
    ...CATALOG_OPTIONS,
  });
}

export function useTiposNotaCredito() {
  return useQuery({
    queryKey: catalogosKeys.tiposNotaCredito(),
    queryFn: catalogosService.getTiposNotaCredito,
    ...CATALOG_OPTIONS,
  });
}

export function useCargosDescuentos() {
  return useQuery({
    queryKey: catalogosKeys.cargosDescuentos(),
    queryFn: catalogosService.getCargosDescuentos,
    ...CATALOG_OPTIONS,
  });
}

export function useTiposOperacion() {
  return useQuery({
    queryKey: catalogosKeys.tiposOperacion(),
    queryFn: catalogosService.getTiposOperacion,
    ...CATALOG_OPTIONS,
  });
}

export function useBienesDetraccion() {
  return useQuery({
    queryKey: catalogosKeys.bienesDetraccion(),
    queryFn: catalogosService.getBienesDetraccion,
    ...CATALOG_OPTIONS,
  });
}
