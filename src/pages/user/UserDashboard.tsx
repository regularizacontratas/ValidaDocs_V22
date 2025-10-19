import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Building2, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formsRepository } from '../../repositories/forms.repository';
import { AppLayout } from '../../layouts/AppLayout';

interface AssignedForm {
  assignmentId: string;
  assignmentType: string;
  canShare: boolean;
  expiresAt: string | null;
  form: {
    id: string;
    form_name: string;
    description: string;
    target_type: string;
    created_at: string;
  };
  ownerCompany: {
    id: string;
    name: string;
  };
}

export function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<AssignedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssignedForms();
  }, []);

  async function loadAssignedForms() {
    try {
      if (!user?.company_id) {
        setError('Usuario sin empresa asignada');
        return;
      }

      const data = await formsRepository.getAssignedForms(user.company_id);
      setForms(data);
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Error al cargar formularios');
    } finally {
      setLoading(false);
    }
  }

  const getAssignmentBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      'VIEW_AND_COMPLETE': { label: 'Ver y Completar', color: 'bg-green-100 text-green-800' },
      'COMPLETE_ONLY': { label: 'Solo Completar', color: 'bg-blue-100 text-blue-800' },
      'READ_ONLY': { label: 'Solo Lectura', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[type] || badges['VIEW_AND_COMPLETE'];
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Formularios</h1>
          <p className="mt-2 text-gray-600">
            Formularios asignados para completar
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay formularios asignados
            </h3>
            <p className="text-gray-600">
              Cuando se te asignen formularios, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((item) => {
              const badge = getAssignmentBadge(item.assignmentType);
              const canComplete = item.assignmentType !== 'READ_ONLY';
              
              return (
                <div
                  key={item.assignmentId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Form Icon & Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Form Info */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.form.form_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.form.description || 'Sin descripción'}
                    </p>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Building2 className="w-4 h-4 mr-2" />
                        <span className="truncate">{item.ownerCompany.name}</span>
                      </div>
                      {item.expiresAt && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Vence: {new Date(item.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {/* Acción principal: para formularios completables y de solo lectura dirigimos a la misma ruta `/user/forms/:id` */}
                    {canComplete ? (
                      <button
                        onClick={() => navigate(`/user/forms/${item.form.id}`)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Llenar Formulario
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/user/forms/${item.form.id}`)}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Ver Formulario
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}