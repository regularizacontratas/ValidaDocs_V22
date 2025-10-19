// src/pages/user/UserSubmissions.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Search,
  Eye,
  ArrowLeft,
  FileText,
  Pencil,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formsRepository } from '../../repositories/forms.repository';
import { formSubmissionsRepository } from '../../repositories/submissions.repository';
import { Modal } from '../../components/Modal';

interface Submission {
  id: string;
  formId: string;
  formName: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
  filesCount: number;
  /** Valores de los primeros campos del formulario, ordenados según field_order */
  firstFields: Array<{ id: string; label: string; type: string; value: any }>;
}

export function UserSubmissions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterForm, setFilterForm] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'form' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal de eliminación
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] =
    useState<Submission | null>(null);
  const openDelete = (s: Submission) => {
    setSubmissionToDelete(s);
    setDeleteOpen(true);
  };
  const closeDelete = () => {
    setSubmittingError('');
    setDeleteOpen(false);
    setSubmissionToDelete(null);
  };

  // Feedback de errores
  const [submittingError, setSubmittingError] = useState<string>('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      if (!user?.id) return;
      const data = await formsRepository.getUserSubmissions(user.id);
      setSubmissions(data as Submission[]);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  // Obtener lista única de formularios para el filtro
  const uniqueForms = useMemo(() => {
    const forms = new Set(submissions.map((s) => s.formName));
    return Array.from(forms);
  }, [submissions]);

  // Obtener lista única de meses para el filtro
  const uniqueMonths = useMemo(() => {
    const months = new Set(
      submissions
        .filter((s) => s.submittedAt || s.updatedAt)
        .map((s) => {
          const date = new Date(s.submittedAt || s.updatedAt);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            '0'
          )}`;
        })
    );
    return Array.from(months).sort().reverse();
  }, [submissions]);

  // Filtrar y ordenar submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    // Búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        // Buscar en nombre del formulario y valores de los primeros campos
        const inForm = s.formName.toLowerCase().includes(search);
        // Algunas submissions podrían no tener firstFields; usar opcional encadenado
        const inFields =
          s.firstFields?.some((f) => {
            if (!f || f.value === null || f.value === undefined) return false;
            return String(f.value).toLowerCase().includes(search);
          }) ?? false;
        return inForm || inFields;
      });
    }

    // Filtro por mes
    if (filterMonth !== 'all') {
      filtered = filtered.filter((s) => {
        const date = new Date(s.submittedAt || s.updatedAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          '0'
        )}`;
        return month === filterMonth;
      });
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    // Filtro por formulario
    if (filterForm !== 'all') {
      filtered = filtered.filter((s) => s.formName === filterForm);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date': {
          const dateA = new Date(a.submittedAt || a.updatedAt).getTime();
          const dateB = new Date(b.submittedAt || b.updatedAt).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'form':
          comparison = a.formName.localeCompare(b.formName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    submissions,
    searchTerm,
    filterMonth,
    filterStatus,
    filterForm,
    sortField,
    sortDirection
  ]);

  // Paginación
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(start, start + itemsPerPage);
  }, [filteredSubmissions, currentPage]);

  const handleSort = (field: 'date' | 'form' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Devuelve un pequeño tag de estado para la tabla. Para ahorrar espacio,
   * sólo se muestra un ícono representativo dentro de una etiqueta
   * coloreada. Los colores coinciden con los distintos estados de la
   * submission.
   */
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING_AI_VALIDATION: 'bg-yellow-100 text-yellow-700',
      AI_VALIDATED: 'bg-purple-100 text-purple-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700'
    };
    const icons: Record<string, string> = {
      DRAFT: '📄',
      PENDING_AI_VALIDATION: '🤖',
      AI_VALIDATED: '✓',
      SUBMITTED: '✓',
      APPROVED: '✅',
      REJECTED: '❌'
    };
    const cls = styles[status] ?? 'bg-gray-100 text-gray-700';
    const icon = icons[status] ?? status.charAt(0);
    return (
      <span
        className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}
        title={status}
      >
        {icon}
      </span>
    );
  };

  /** Formatea la fecha en formato dd-mm-yy para ahorrar espacio */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  /** Convierte un valor de mes 'yyyy-mm' en un nombre legible */
  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  };

  /** Navega a la edición si el registro está en borrador */
  const handleEdit = (s: Submission) => {
    if (s.status !== 'DRAFT') return;
    navigate(`/user/forms/${s.formId}?submissionId=${s.id}`);
  };

  /** Confirma la eliminación de un registro */
  const handleConfirmDelete = async () => {
    if (!submissionToDelete) return;
    try {
      setDeleting(true);
      await formSubmissionsRepository.deleteById(submissionToDelete.id);
      setSubmissions((prev) => prev.filter((x) => x.id !== submissionToDelete.id));
      closeDelete();
    } catch (err: any) {
      setSubmittingError(err?.message || 'No se pudo eliminar el registro');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Determinar si el usuario está filtrando por un formulario específico
  const isSpecificForm = filterForm !== 'all';

  // Número de columnas de campos dinámicos a mostrar.
  // Si se filtra por un formulario concreto se muestran 5, de lo contrario 4.
  const columnsToShow = isSpecificForm ? 5 : 4;

  // Etiquetas de columnas para los campos dinámicos
  let fieldColumnLabels: string[] = [];
  if (isSpecificForm) {
    // Usa una submission del formulario para obtener las etiquetas de los primeros campos
    const submissionForLabels = submissions.find((s) => s.formName === filterForm);
    if (submissionForLabels && Array.isArray(submissionForLabels.firstFields)) {
      fieldColumnLabels = submissionForLabels.firstFields
        .slice(0, columnsToShow)
        .map((f) => f.label);
    }
    // Si hay menos campos que columnas visibles, rellena con "Campo N"
    while (fieldColumnLabels.length < columnsToShow) {
      fieldColumnLabels.push(`Campo ${fieldColumnLabels.length + 1}`);
    }
  } else {
    // Vista genérica: etiquetas genéricas "Campo 1…"
    fieldColumnLabels = Array.from(
      { length: columnsToShow },
      (_, i) => `Campo ${i + 1}`
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/user/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Mis Formularios Enviados
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredSubmissions.length}{' '}
            {filteredSubmissions.length === 1 ? 'formulario' : 'formularios'}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Nombre, apellido, formulario..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filtro por mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                {uniqueMonths.map((month) => (
                  <option key={month} value={month}>
                    {getMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                <option value="DRAFT">📄 Borrador</option>
                <option value="PENDING_AI_VALIDATION">🤖 Análisis IA</option>
                <option value="AI_VALIDATED">✓ IA Validó</option>
                <option value="SUBMITTED">✓ Enviado</option>
                <option value="APPROVED">✅ Aprobado</option>
                <option value="REJECTED">❌ Rechazado</option>
              </select>
            </div>
          </div>

          {/* Filtro por formulario */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Formulario
            </label>
            <select
              value={filterForm}
              onChange={(e) => {
                setFilterForm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los formularios</option>
              {uniqueForms.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  >
                    Fecha{' '}
                    {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  {!isSpecificForm && (
                    <th
                      onClick={() => handleSort('form')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Formulario{' '}
                      {sortField === 'form' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {/* Columnas de campos dinámicos */}
                  {fieldColumnLabels.map((label, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                  <th
                    onClick={() => handleSort('status')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  >
                    Estado{' '}
                    {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Archivos
                  </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        1 + (isSpecificForm ? 0 : 1) + columnsToShow + 1 + 1 + 1
                      }
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No se encontraron formularios
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map((submission) => {
                    // Obtiene los valores de los primeros campos a mostrar
                    const fieldValues: any[] = [];
                    for (let i = 0; i < columnsToShow; i++) {
                      // Usa opcional encadenado para evitar errores si firstFields no existe
                      const f = submission.firstFields?.[i];
                      if (f && f.value !== undefined && f.value !== null) {
                        fieldValues.push(f.value);
                      } else {
                        fieldValues.push('-');
                      }
                    }
                    return (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                          {formatDate(submission.submittedAt || submission.updatedAt)}
                        </td>
                        {!isSpecificForm && (
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {submission.formName}
                          </td>
                        )}
                        {/* Renderizar valores de los primeros campos */}
                        {fieldValues.map((val, idx) => (
                          <td
                            key={idx}
                            className="px-4 py-3 whitespace-nowrap text-gray-900 truncate max-w-xs"
                          >
                            {String(val)}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {submission.filesCount > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {submission.filesCount}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Ver */}
                            <button
                              onClick={() =>
                                navigate(`/user/submissions/${submission.id}`)
                              }
                              className="p-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Ver detalles"
                            >
                              <Eye className="w-5 h-5" />
                            </button>

                            {/* Editar (solo en borrador) */}
                            <button
                              onClick={() => handleEdit(submission)}
                              disabled={submission.status !== 'DRAFT'}
                              className={`p-1 ${
                                submission.status === 'DRAFT'
                                  ? 'text-amber-600 hover:text-amber-800'
                                  : 'text-gray-300 cursor-not-allowed'
                              } focus:outline-none`}
                              title={
                                submission.status === 'DRAFT'
                                  ? 'Editar borrador'
                                  : 'Solo se puede editar cuando está en Borrador'
                              }
                            >
                              <Pencil className="w-5 h-5" />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => openDelete(submission)}
                              className="p-1 text-red-600 hover:text-red-800 focus:outline-none"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)} de{' '}
                {filteredSubmissions.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de eliminar */}
      <Modal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Eliminar formulario"
      >
        <div className="space-y-4 text-sm">
          {submittingError && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {submittingError}
            </div>
          )}
          <p className="text-gray-700">
            ¿Seguro que quieres eliminar este registro?
          </p>
          {submissionToDelete && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800">
              <div className="font-medium">{submissionToDelete.formName}</div>
              {/* Para identificar rápidamente al registro podemos mostrar los primeros valores */}
              <div className="mt-1">
                {(submissionToDelete.firstFields?.slice(0, 2) || []).map(
                  (f, idx) => (
                    <span key={idx} className="block truncate">
                      {f.label}: {String(f.value ?? '-')}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeDelete}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
