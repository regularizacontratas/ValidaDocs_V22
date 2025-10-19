import { supabase } from '../lib/supabase';
import { FormField } from '../types/database.types';

export const formFieldsRepository = {
  async getByFormId(formId: string): Promise<FormField[]> {
    const { data, error } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('field_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(field: Partial<FormField>): Promise<FormField> {
    const { data, error } = await supabase
      .from('form_fields')
      .insert(field)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async bulkCreate(fields: Partial<FormField>[]): Promise<FormField[]> {
    const { data, error } = await supabase
      .from('form_fields')
      .insert(fields)
      .select('*');

    if (error) throw error;
    return data || [];
  },
};
