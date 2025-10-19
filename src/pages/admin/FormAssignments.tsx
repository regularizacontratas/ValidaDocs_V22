import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Loader2, Building2, Plus, X, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../../layouts/AppLayout';

export function FormAssignments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar formularios de mi empresa
      const { data: formsData } = await supabase
        .from('forms')
        .select('*')
        .eq('owner_company_id', user?.company_id);
      
      // Cargar todas las empresas menos la mía
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .neq('id', user?.company_id);

      // Cargar asignaciones actuales
      const { data: assignmentsData } = await supabase
        .from('form_assignments')
        .select(`
          *,
          forms (form_name),
          companies:assigned_company_id (name)
        `)
        .eq('owner_company_id', user?.company_id)
        .eq('is_active', true);

      setForms(formsData || []);
      setCompanies(companiesData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedForm || !selectedCompany) return;

    try {
      const { error } = await supabase
        .from('form_assignments')
        .insert({
          form_id: selectedForm,
          owner_company_id: user?.company_id,
          assigned_company_id: selectedCompany,
          assignment_type: 'VIEW_AND_COMPLETE',
          is_active: true
        });

      if (!error) {
        await loadData();
        setSelectedForm('');
        setSelectedCompany('');
      }
    } catch (error) {
      console.error('Error asignando formulario:', error);
    }
  }

  async function handleRemoveAssignment(id: string) {
    try {
      const { error } = await supabase
        .from('form_assignments')
        .update({ is_active: false })
        .eq('id', id);

      if (!error) {
        await loadData();
      }
    } catch (error) {
      console.error('Error removiendo asignación:', error);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Botón Volver */}
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </button>

        <h2 className="text-2xl font-bold mb-6">Asignación de Formularios</h2>

        {/* Formulario de asignación */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Nueva Asignación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar Formulario</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>
                  {form.form_name}
                </option>
              ))}
            </select>

            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar Empresa</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleAssign}
              disabled={!selectedForm || !selectedCompany}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Asignar
            </button>
          </div>
        </div>

        {/* Lista de asignaciones */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Asignaciones Activas</h3>
          </div>
          <div className="divide-y">
            {assignments.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">
                No hay asignaciones activas
              </p>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{assignment.forms?.form_name}</p>
                      <p className="text-sm text-gray-500">
                        Asignado a: {assignment.companies?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
