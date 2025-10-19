import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Building2, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formsRepository } from '../../repositories/forms.repository';
import { AppLayout } from '../../layouts/AppLayout';

interface FormWithCompany {
  id: string;
  form_name: string;
  description: string | null;
  target_type: string;
  version: number;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    name: string;
    rut: string;
  };
}

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllForms();
  }, []);

  async function loadAllForms() {
    try {
      setLoading(true);
      const data = await formsRepository.getAll();
      setForms(data as FormWithCompany[]);
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
      PERSON: 'Persona',
      PERSONA: 'Persona',
      EMPRESA: 'Empresa',
      VEHICLE: 'Vehículo',
      EQUIPMENT: 'Equipo',
    };
    return labels[type] || type;
  };

  const getTargetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      COMPANY: 'bg-blue-100 text-blue-800',
      PERSON: 'bg-green-100 text-green-800',
      PERSONA: 'bg-green-100 text-green-800',
      EMPRESA: 'bg-blue-100 text-blue-800',
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
              Todos los Formularios
            </h2>
            <p className="text-gray-600">
              Vista global de formularios de todas las empresas
            </p>
          </div>
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
              No hay formularios en el sistema
            </h3>
            <p className="text-gray-600">
              Las empresas aún no han creado formularios
            </p>
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
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTargetTypeColor(form.target_type)}`}>
                    {getTargetTypeLabel(form.target_type)}
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

                {/* Empresa propietaria */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span className="font-medium">{form.company.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-6">
                    RUT: {form.company.rut}
                  </div>
                </div>

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
                    onClick={() => navigate(`/superadmin/forms/${form.id}/view`)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
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