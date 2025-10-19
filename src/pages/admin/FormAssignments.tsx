import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Loader2, Building2, Plus, X, ArrowLeft, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../layouts/AppLayout';
import { useFormAssignments } from '../../hooks/useFormAssignments';

export function FormAssignments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { forms, companies, assignments, loading, error: loadError, loadData } = useFormAssignments();
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

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

  if (loading && assignments.length === 0) {
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

        {loadError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <div className="flex">
              <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500 mr-3" /></div>
              <div>
                <p className="font-bold">Error al cargar</p>
                <p className="text-sm">{loadError}</p>
              </div>
            </div>
          </div>
        )}

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
            {loading && assignments.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : assignments.length === 0 ? (
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
    </AppLayout>
  );
}
