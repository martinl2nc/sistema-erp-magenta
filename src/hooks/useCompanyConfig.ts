'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanyConfig,
  saveCompanyConfig,
  uploadCompanyLogo,
  deleteCompanyLogo,
} from '@/services/companyConfig.service';
import type { CompanyConfigFormData } from '@/services/companyConfig.service';

export const companyConfigKeys = {
  all: () => ['companyConfig'] as const,
  detail: () => [...companyConfigKeys.all(), 'detail'] as const,
};

export const useCompanyConfig = () => {
  return useQuery({
    queryKey: companyConfigKeys.detail(),
    queryFn: getCompanyConfig,
  });
};

export const useSaveCompanyConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: CompanyConfigFormData }) =>
      saveCompanyConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyConfigKeys.detail() });
    },
  });
};

export const useUploadCompanyLogo = () => {
  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
  });
};

export const useDeleteCompanyLogo = () => {
  return useMutation({
    mutationFn: (publicUrl: string) => deleteCompanyLogo(publicUrl),
  });
};
