import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { FileText, Loader2, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formAssignmentsRepository } from '../../repositories/form-assignments.repository';

interface FormAssignmentWithForm {
  id: string;
  form_id: string;
  assignment_type: string;
  can_share: boolean;
  expires_at?: string;
  created_at?: string;
  forms: {
    id: string;
    form_name: string;
    description?: string;
    target_type: string;
  };
}

export function UserForms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<FormAssignmentWithForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.company_id) {
      loadAssignments();
    }
  }, [user]);

  async function loadAssignments() {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      const data = await formAssignmentsRepository.getByCompany(user.company_id);
      setAssignments(data as FormAssignmentWithForm[]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar formularios asignados');
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
      VEHICLE: 'Vehículo',
      EQUIPMENT: 'Equipo',
    };
    return labels[type] || type;
  };

  const getTargetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      COMPANY: 'bg-blue-100 text-blue-800',
      PERSON: 'bg-green-100 text-green-800',
      VEHICLE: 'bg-yellow-100 text-yellow-800',
      EQUIPMENT: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAssignmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DIRECT: 'Directo',
      REQUESTED: 'Solicitado',
      INHERITED: 'Heredado',
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout title="Mis Formularios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Formularios Asignados
            </h2>
            <p className="text-gray-600">
              Completa los formularios que te han sido asignados
            </p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">
              Total: {assignments.length}
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
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes formularios asignados
            </h3>
            <p className="text-gray-600">
              Los formularios aparecerán aquí cuando tu administrador te los asigne
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTargetTypeColor(assignment.forms.target_type)}`}>
                    {getTargetTypeLabel(assignment.forms.target_type)}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {assignment.forms.form_name}
                </h3>

                {assignment.forms.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {assignment.forms.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Building2 className="w-4 h-4" />
                    <span>{getAssignmentTypeLabel(assignment.assignment_type)}</span>
                  </div>

                  {assignment.can_share && (
                    <div className="text-xs text-green-600 font-medium">
                      Puede compartir
                    </div>
                  )}

                  {assignment.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      Expira: {formatDate(assignment.expires_at)}
                    </div>
                  )}
                </div>

                <button
                 /* Para completar o visualizar el formulario dirigimos a la ruta `/user/forms/:id` */
                 onClick={() => navigate(`/user/forms/${assignment.form_id}`)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Completar formulario
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Información importante
          </h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Los formularios asignados deben completarse antes de su fecha de expiración</li>
            <li>• Puedes guardar tu progreso y continuar más tarde</li>
            <li>• Una vez enviado, el formulario será validado automáticamente</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
