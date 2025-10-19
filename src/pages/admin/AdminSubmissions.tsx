// ✅ src/pages/admin/AdminSubmissions.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppLayout } from "../../layouts/AppLayout";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { formSubmissionsRepository } from "../../repositories/submissions.repository";

interface Submission {
  id: string;
  created_at: string;
  status: string;
  form_id: string;
  form_name: string;
  user_name: string;
  user_lastname: string;
  file_count: number;
  form_target_type: "PERSONA" | "EMPRESA" | string;
}

export function AdminSubmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [monthFilter, setMonthFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos los formularios");

  // paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // eliminar (modal)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorDelete, setErrorDelete] = useState<string>("");
  const [toDelete, setToDelete] = useState<{
    id: string;
    formName: string;
    nombre: string;
    apellido: string;
  } | null>(null);

  useEffect(() => {
    if (user?.company_id) {
      loadSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company_id]);

  async function loadSubmissions() {
    try {
      setLoading(true);

      // Submissions de la empresa del ADMIN
      // Nota: la tabla `forms` usa `owner_company_id` para enlazar con la empresa propietaria.
      // Seleccionamos `owner_company_id` y filtramos por este campo para obtener las submissions
      // correspondientes a la empresa del administrador.
      const { data, error } = await supabase
        .from("form_submissions")
        .select(
          `
          id,
          created_at,
          status,
          forms!inner (
            id,
            form_name,
            target_type,
            owner_company_id
          ),
          users!inner (
            name,
            lastname
          )
        `
        )
        .eq("forms.owner_company_id", user?.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const submissionIds = (data ?? []).map((s: any) => s.id);
      let fileCounts: Record<string, number> = {};
      if (submissionIds.length > 0) {
        const { data: filesData } = await supabase
          .from("file_attachments")
          .select("submission_id")
          .in("submission_id", submissionIds);

        fileCounts =
          filesData?.reduce((acc: Record<string, number>, f: any) => {
            acc[f.submission_id] = (acc[f.submission_id] || 0) + 1;
            return acc;
          }, {}) ?? {};
      }

      const formatted: Submission[] =
        data?.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          status: item.status,
          form_id: item.forms.id,
          form_name: item.forms.form_name,
          form_target_type: item.forms.target_type,
          user_name: item.users.name,
          user_lastname: item.users.lastname,
          file_count: fileCounts[item.id] || 0,
        })) ?? [];

      setSubmissions(formatted);
    } catch (e) {
      console.error("Error cargando submissions:", e);
    } finally {
      setLoading(false);
    }
  }

  // meses únicos dinámicos
  const uniqueMonths = useMemo(() => {
    const months = new Set(
      submissions.map((s) => {
        const d = new Date(s.created_at);
        return d.toLocaleString("es", { month: "long" }).toLowerCase();
      })
    );
    return Array.from(months);
  }, [submissions]);

  // filtros
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        sub.user_name.toLowerCase().includes(search) ||
        sub.user_lastname.toLowerCase().includes(search) ||
        sub.form_name.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "Todos" || sub.status === statusFilter;

      const matchesMonth =
        monthFilter === "Todos" ||
        new Date(sub.created_at)
          .toLocaleString("es", { month: "long" })
          .toLowerCase() === monthFilter.toLowerCase();

      const matchesType =
        typeFilter === "Todos los formularios" ||
        sub.form_target_type === typeFilter;

      return matchesSearch && matchesStatus && matchesMonth && matchesType;
    });
  }, [submissions, searchTerm, statusFilter, monthFilter, typeFilter]);

  // paginación
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // badges de estado
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      PENDING_AI_VALIDATION: "bg-yellow-100 text-yellow-800",
      AI_VALIDATION_FAILED: "bg-red-100 text-red-800",
      AI_VALIDATED: "bg-purple-100 text-purple-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      DRAFT: "Borrador",
      PENDING_AI_VALIDATION: "Validando",
      AI_VALIDATION_FAILED: "Error IA",
      AI_VALIDATED: "✓ IA Validó",
      SUBMITTED: "✓ Enviado",
      APPROVED: "✓ Aprobado",
      REJECTED: "✗ Rechazado",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          styles[status] || styles.DRAFT
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  // —— eliminar (modal) ——
  const openDelete = (row: Submission) => {
    setErrorDelete("");
    setToDelete({
      id: row.id,
      formName: row.form_name,
      nombre: row.user_name,
      apellido: row.user_lastname,
    });
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setToDelete(null);
    setErrorDelete("");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      setErrorDelete("");
      await formSubmissionsRepository.deleteById(toDelete.id);
      await loadSubmissions();
      closeDelete();
    } catch (e: any) {
      setErrorDelete(e?.message || "Ocurrió un error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Formularios Enviados">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Formularios Enviados">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Formularios Enviados
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredSubmissions.length}{" "}
            {filteredSubmissions.length === 1 ? "formulario" : "formularios"}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Nombre, apellido, formulario..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro Mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Todos</option>
                {uniqueMonths.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Todos</option>
                <option>DRAFT</option>
                <option>PENDING_AI_VALIDATION</option>
                <option>AI_VALIDATION_FAILED</option>
                <option>AI_VALIDATED</option>
                <option>SUBMITTED</option>
                <option>APPROVED</option>
                <option>REJECTED</option>
              </select>
            </div>

            {/* Filtro Tipo */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Formulario
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Todos los formularios</option>
                <option>PERSONA</option>
                <option>EMPRESA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {currentSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                No se encontraron formularios enviados
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Formulario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Apellido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Archivos
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(submission.created_at).toLocaleDateString(
                            "es-CL"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {submission.form_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {submission.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {submission.user_lastname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {submission.file_count > 0 ? (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4 text-gray-400" />
                              {submission.file_count}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {/* Ver detalle */}
                          <button
                            onClick={() =>
                              navigate(`/admin/submissions/${submission.id}`)
                            }
                            className="inline-flex items-center justify-center w-9 h-9 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {/* Editar (solo Borrador) */}
                          <button
                            onClick={() =>
                              navigate(
                                `/user/forms/${submission.form_id}?submissionId=${submission.id}`
                              )
                            }
                            disabled={submission.status !== "DRAFT"}
                            className="inline-flex items-center justify-center w-9 h-9 ml-2 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              submission.status === "DRAFT"
                                ? "Editar borrador"
                                : "Solo se puede editar si está en Borrador"
                            }
                          >
                            <Pencil className="w-5 h-5" />
                          </button>

                          {/* Eliminar (siempre) */}
                          <button
                            onClick={() => openDelete(submission)}
                            className="inline-flex items-center justify-center w-9 h-9 ml-2 rounded-lg text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {startIndex + 1} a{" "}
                    {Math.min(endIndex, filteredSubmissions.length)} de{" "}
                    {filteredSubmissions.length} resultados
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-1 text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Confirmación de Eliminación */}
      <Modal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Eliminar formulario"
      >
        {errorDelete && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {errorDelete}
          </div>
        )}

        <p className="text-sm text-gray-700 mb-3">
          ¿Seguro que quieres eliminar este registro?
        </p>

        {toDelete && (
          <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <div className="font-medium text-gray-900">{toDelete.formName}</div>
            <div className="text-gray-600">
              {toDelete.nombre} {toDelete.apellido}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={closeDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
