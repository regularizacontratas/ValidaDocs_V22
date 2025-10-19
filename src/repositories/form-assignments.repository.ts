import { supabase } from '../lib/supabase';
import { FormAssignment } from '../types/database.types';

export const formAssignmentsRepository = {
  async getByCompany(companyId: string): Promise<FormAssignment[]> {
    const { data, error } = await supabase
      .from('form_assignments')
      .select('*')
      .eq('assigned_company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async listAssignmentsForCompany(companyId: string) {
    return supabase
      .from('form_assignments')
      .select('*')
      .or(`owner_company_id.eq.${companyId},assigned_company_id.eq.${companyId}`)
      .order('created_at', { ascending: false });
  },

  async create(assignment: Partial<FormAssignment>): Promise<FormAssignment> {
    const { data, error } = await supabase
      .from('form_assignments')
      .insert(assignment)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async createAssignment(
    formId: string,
    ownerCompanyId: string,
    assignedCompanyId: string
  ) {
    return supabase.from('form_assignments').insert({
      id: crypto.randomUUID(),
      form_id: formId,
      owner_company_id: ownerCompanyId,
      assigned_company_id: assignedCompanyId,
      assignment_type: 'DIRECT',
      is_active: true,
      can_share: false,
    });
  },
};
