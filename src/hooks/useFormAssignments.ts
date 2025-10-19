// src/hooks/useFormAssignments.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useFormAssignments() {
  const { user } = useAuth();
  const [forms, setForms] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.company_id) return;

    setLoading(true);
    setError(null);
    try {
      const [formsRes, companiesRes, assignmentsRes] = await Promise.all([
        supabase.from('forms').select('*').eq('owner_company_id', user.company_id),
        supabase.from('companies').select('*').neq('id', user.company_id),
        supabase.from('form_assignments').select('*, forms(form_name), companies:assigned_company_id(name)').eq('owner_company_id', user.company_id).eq('is_active', true)
      ]);

      if (formsRes.error) throw formsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setForms(formsRes.data || []);
      setCompanies(companiesRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (err: any) {
      console.error('Error cargando datos de asignaciones:', err);
      setError('No se pudieron cargar los datos. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { forms, companies, assignments, loading, error, loadData };
}
