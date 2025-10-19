import { supabase } from '../lib/supabase';
import { Company } from '../types/database.types';

export const companiesRepository = {
  async getAll(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(company: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async createCompany(name: string, rut: string, companyType: string, createdBy: string): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        id: crypto.randomUUID(),
        name,
        rut,
        company_type: companyType,
        created_by: createdBy,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async checkRutExists(rut: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('companies')
      .select('id')
      .eq('rut', rut);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async updateCompanyLogo(companyId: string, logoUrl: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ logo_url: logoUrl })
      .eq('id', companyId);

    if (error) throw error;
  },
};
