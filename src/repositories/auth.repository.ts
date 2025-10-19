import { supabase } from '../lib/supabase';
import { User } from '../types/database.types';

export const authRepository = {
  async signUpAndUpsertUser(name: string, email: string, password: string) {
    const { data: sign, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = sign.user;
    if (!user) throw new Error('No se obtuvo usuario de Auth');

    const { error: upsertErr } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          name,
          email,
          role: 'USER',
        },
        { onConflict: 'id' }
      );

    if (upsertErr) throw upsertErr;

    return user;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return data.user;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getCurrentUserWithRole(): Promise<{ auth: any; profile: User } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return { auth: user, profile: data };
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUserWithRole(
    name: string,
    email: string,
    password: string,
    role: string,
    companyId: string | null,
    createdBy: string
  ) {
    const { data: sign, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = sign.user;
    if (!user) throw new Error('No se obtuvo usuario de Auth');

    const { error: upsertErr } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          name,
          email,
          role,
          company_id: companyId,
          created_by: createdBy,
        },
        { onConflict: 'id' }
      );

    if (upsertErr) throw upsertErr;

    return user;
  },
};
