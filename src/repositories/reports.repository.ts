// src/repositories/reports.repository.ts
import { supabase } from '../lib/supabase'; // ajusta la ruta si tu cliente está en otro lugar

export type ReportRow = {
  row_value: string;
  form_statuses: Record<string, string | null>;
};

export const reportsRepository = {
  async getAvailableFieldLabels(): Promise<string[]> {
    const { data, error } = await supabase
      .from('form_fields')
      .select('label')
      .order('label', { ascending: true });

    if (error) throw error;

    // dedup + filtrar nulos
    const labels = (data ?? [])
      .map((d) => d.label)
      .filter((x): x is string => Boolean(x));

    return Array.from(new Set(labels));
  },

  async getMatrix(label: string): Promise<ReportRow[]> {
    const { data, error } = await supabase
      .rpc('get_form_summary_matrix', { selected_label: label });

    if (error) throw error;

    // La función devuelve un arreglo JSON o null
    return (data as ReportRow[]) ?? [];
  },
};
