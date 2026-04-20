'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersService } from '@/services/sellers.service';
import type { SellerFormData, CreateSellerData, SellersListParams } from '@/services/sellers.service';

export const sellersKeys = {
  all: ['sellers'] as const,
  list: (params?: SellersListParams) => [...sellersKeys.all, 'list', params] as const,
  detail: (id: string) => [...sellersKeys.all, 'detail', id] as const,
};

export function useSellersList(params?: SellersListParams) {
  return useQuery({
    queryKey: sellersKeys.list(params),
    queryFn: () => sellersService.getSellers(params),
    placeholderData: (prev) => prev,
  });
}

export function useSellersActive() {
  return useQuery({
    queryKey: [...sellersKeys.all, 'active'] as const,
    queryFn: () => sellersService.getSellersActive(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newSeller: CreateSellerData) => sellersService.createSeller(newSeller),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.all });
    },
  });
}

export function useUpdateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SellerFormData> }) =>
      sellersService.updateSeller(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.all });
    },
  });
}

export function useDeleteSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sellersService.deleteSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.all });
    },
  });
}

export function useToggleSellerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: boolean }) =>
      sellersService.toggleSellerActive(id, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.all });
    },
  });
}
