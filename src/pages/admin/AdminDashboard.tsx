import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus, Calendar, User, Building } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formsRepository } from '../../repositories/forms.repository';
import { Form } from '../../types/database.types';
import { AppLayout } from '../../layouts/AppLayout';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.company_id) {
      loadForms();
    }
  }, [user]);

  async function loadForms() {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      const data = await formsRepository.getByCompany(user.company_id);
      setForms(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar formularios');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      COMPANY: 'Empresa',
      EMPRESA: 'Empresa',
      PERSON: 'Persona',
      PERSONA: 'Persona',
      VEHICLE: 'Vehículo',
      EQUIPMENT: 'Equipo',
    };
    return labels[type] || type;
  };

  const getTargetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      COMPANY: 'bg-blue-100 text-blue-800',
      EMPRESA: 'bg-blue-100 text-blue-800',
      PERSON: 'bg-green-100 text-green-800',
      PERSONA: 'bg-green-100 text-green-800',
      VEHICLE: 'bg-yellow-100 text-yellow-800',
      EQUIPMENT: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Mis Formularios
            </h2>
            <p className="text-gray-600">
              Gestiona los formularios de tu organización
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/forms/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Nuevo formulario
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Cargando formularios...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800">{error}</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes formularios
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primer formulario para empezar a recopilar información
            </p>
            <button 
              onClick={() => navigate('/admin/forms/create')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Crear formulario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-6 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>

                  {/* ✅ Tag con ícono de tipo */}
                  <span
                    className={`px-3 py-1 inline-flex items-center text-xs font-semibold rounded-full ${
                      form.target_type === 'PERSONA' || form.target_type === 'PERSON'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {form.target_type === 'PERSONA' || form.target_type === 'PERSON' ? (
                      <User className="w-3 h-3 mr-1" />
                    ) : (
                      <Building className="w-3 h-3 mr-1" />
                    )}
                    {form.target_type === 'PERSONA' || form.target_type === 'PERSON'
                      ? 'Persona'
                      : 'Empresa'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {form.form_name}
                </h3>

                {form.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-100 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(form.updated_at)}
                  </div>
                  {form.version && (
                    <div>
                      v{form.version}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/forms/${form.id}/fill`)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    Llenar
                  </button>

                  <button
                    onClick={() =>
                      navigate('/admin/forms/assignments', { state: { formId: form.id } })
                    }
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
