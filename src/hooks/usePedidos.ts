'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '@/services/pedidos.service';
import type { PedidoEstado, CreatePedidoPayload, UpdatePedidoBasicPayload } from '@/services/pedidos.service';

export const pedidosKeys = {
  all: ['pedidos'] as const,
  list: () => [...pedidosKeys.all, 'list'] as const,
  detail: (id: string) => [...pedidosKeys.all, 'detail', id] as const,
};

export function usePedidosList() {
  return useQuery({
    queryKey: pedidosKeys.list(),
    queryFn: pedidosService.getPedidos,
  });
}

export function useCreatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePedidoPayload) => pedidosService.createPedido(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}

export function useUpdatePedidoForEmision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { direccion_facturacion?: string } }) =>
      pedidosService.updateForEmision(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}

export function useUpdatePedidoEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: PedidoEstado }) =>
      pedidosService.updateEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}

export function useUpdatePedidoBasic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePedidoBasicPayload }) =>
      pedidosService.updatePedidoBasic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
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

export function useUpdatePedidoCompleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, lineas }: { id: string; payload: CreatePedidoPayload; lineas: any[] }) =>
      pedidosService.updatePedidoCompleto(id, payload, lineas),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
      queryClient.invalidateQueries({ queryKey: pedidosKeys.detail(id) });
    },
  });
}
