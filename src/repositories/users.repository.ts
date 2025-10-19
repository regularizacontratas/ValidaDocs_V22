import { supabase } from '../lib/supabase';
import { User } from '../types/database.types';

export const usersRepository = {
  async getAll(): Promise<User[]> {
    const { data, error} = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async listUsersByCompany(companyId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserRole(id: string, role: string, companyId?: string): Promise<User> {
    const updates: any = { role };
    if (companyId) updates.company_id = companyId;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async updateUserAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl || null })
      .eq('id', userId);

    if (error) throw error;
  },
};
