import { createClient } from '@/lib/supabase/client';

export interface UbigeoRecord {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export const getAllUbigeos = async (): Promise<UbigeoRecord[]> => {
  const supabase = createClient();
  const PAGE_SIZE = 1000;
  const results: UbigeoRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cat_ubigeo')
      .select('codigo, departamento, provincia, distrito')
      .order('codigo')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error('Error al cargar ubigeos: ' + error.message);
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return results;
};
