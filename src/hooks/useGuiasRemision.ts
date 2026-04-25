'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGuiasRemision,
  getMotivoTraslado,
  emitirGuiaRemision,
} from '@/services/guiasRemision.service';
import type { GuiasRemisionListParams, EmitirGuiaRemisionPayload, PaginatedGuias } from '@/services/guiasRemision.service';

// ─── Query Key Factory ────────────────────────────────────────

export const guiasRemisionKeys = {
  all:    ()                       => ['guias-remision'] as const,
  lists:  ()                       => [...guiasRemisionKeys.all(), 'list'] as const,
  list:   (p?: GuiasRemisionListParams) => [...guiasRemisionKeys.lists(), p] as const,
  detail: (id: string)             => [...guiasRemisionKeys.all(), 'detail', id] as const,
  motivos: ()                      => ['motivos-traslado'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

export const useGuiasRemision = (params?: GuiasRemisionListParams, initialData?: PaginatedGuias) => {
  return useQuery({
    queryKey: guiasRemisionKeys.list(params),
    queryFn: () => getGuiasRemision(params),
    placeholderData: prev => prev,
    initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
  });
};

export const useMotivoTraslado = () => {
  return useQuery({
    queryKey: guiasRemisionKeys.motivos(),
    queryFn: getMotivoTraslado,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });
};

export const useEmitirGuiaRemision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmitirGuiaRemisionPayload) => emitirGuiaRemision(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guiasRemisionKeys.lists() });
    },
  });
};
