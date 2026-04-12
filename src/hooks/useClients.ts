'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClients,
  getActiveClients,
  createClientRecord,
  updateClient,
  toggleClientActive,
  deleteClient,
} from '@/services/clients.service';
import type { ClientFormData, ClientsListParams } from '@/services/clients.service';

export const clientsKeys = {
  all: () => ['clients'] as const,
  lists: () => [...clientsKeys.all(), 'list'] as const,
  list: (params?: ClientsListParams) => [...clientsKeys.lists(), params] as const,
  active: () => [...clientsKeys.all(), 'active'] as const,
};

export const useClientsList = (params?: ClientsListParams) => {
  return useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => getClients(params),
    placeholderData: (prev) => prev,
  });
};

export const useActiveClientsList = () => {
  return useQuery({
    queryKey: clientsKeys.active(),
    queryFn: getActiveClients,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClientFormData) => createClientRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientsKeys.active() });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientFormData> }) =>
      updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientsKeys.active() });
    },
  });
};

export const useToggleClientActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      toggleClientActive(id, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientsKeys.active() });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientsKeys.active() });
    },
  });
};
