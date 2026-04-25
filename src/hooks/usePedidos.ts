'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '@/services/pedidos.service';
import type { PedidoEstado, CreatePedidoPayload, CreatePedidoLineaPayload, UpdatePedidoBasicPayload, PedidosListParams } from '@/services/pedidos.service';

export const pedidosKeys = {
  all: () => ['pedidos'] as const,
  lists: () => [...pedidosKeys.all(), 'list'] as const,
  list: (params?: PedidosListParams) => [...pedidosKeys.lists(), params] as const,
  detail: (id: string) => [...pedidosKeys.all(), 'detail', id] as const,
  lines: (id: string) => [...pedidosKeys.all(), 'lines', id] as const,
  sustento: (path: string) => [...pedidosKeys.all(), 'sustento', path] as const,
};

export function usePedidosList(params?: PedidosListParams) {
  return useQuery({
    queryKey: pedidosKeys.list(params),
    queryFn: () => pedidosService.getPedidos(params),
    placeholderData: (prev) => prev,
  });
}

export function usePedidosElegiblesFacturacion() {
  return useQuery({
    queryKey: [...pedidosKeys.all(), 'elegibles-facturacion'] as const,
    queryFn: () => pedidosService.getPedidosElegiblesFacturacion(),
  });
}

export function useCreatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePedidoPayload) => pedidosService.createPedido(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
    },
  });
}

export function useUpdatePedidoForEmision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { direccion_facturacion?: string } }) =>
      pedidosService.updateForEmision(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(id) });
    },
  });
}

export function useUpdatePedidoEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado, motivo_anulacion }: { id: string; estado: PedidoEstado; motivo_anulacion?: string }) =>
      pedidosService.updateEstado(id, { estado, motivo_anulacion }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(id) });
    },
  });
}

export function useUpdatePedidoBasic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePedidoBasicPayload }) =>
      pedidosService.updatePedidoBasic(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(id) });
    },
  });
}

export function usePedido(id?: string) {
  return useQuery({
    queryKey: pedidosKeys.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const pedido = await pedidosService.getPedidoById(id);
      const lineas = await pedidosService.getPedidoLineas(id);
      return { ...pedido, lineas };
    },
    enabled: !!id,
  });
}

export function usePedidoLineas(pedidoId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: pedidosKeys.lines(pedidoId!),
    queryFn: () => pedidosService.getPedidoLineas(pedidoId!),
    enabled: !!pedidoId && enabled,
  });
}

export function usePedidoSustento(path: string | undefined) {
  return useQuery({
    queryKey: pedidosKeys.sustento(path!),
    queryFn: () => pedidosService.getSustentoSignedUrl(path!),
    enabled: !!path,
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}

export function useSustentoSignedUrl() {
  return useMutation({
    mutationFn: (path: string) => pedidosService.getSustentoSignedUrl(path),
  });
}

export function useUploadSustento() {
  return useMutation({
    mutationFn: ({ file, cotizacionId }: { file: File; cotizacionId: string | null }) =>
      pedidosService.uploadSustento(file, cotizacionId),
  });
}

export function useCreatePedidoLineas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineas: CreatePedidoLineaPayload[]) => pedidosService.createPedidoLineas(lineas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
    },
  });
}

export function useUpdatePedidoCompleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, lineas }: { id: string; payload: CreatePedidoPayload; lineas: CreatePedidoLineaPayload[] }) =>
      pedidosService.updatePedidoCompleto(id, payload, lineas),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(id) });
    },
  });
}
