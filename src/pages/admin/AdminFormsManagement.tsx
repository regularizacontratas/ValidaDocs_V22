// ✅ src/pages/admin/AdminFormsManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import {
  FileText, ArrowLeft, ChevronRight, Loader2, AlertCircle, Plus,
  CheckCircle, Pencil, Trash2, AlertTriangle, Building2, UserRound
} from "lucide-react";
import { Form } from "../../types/database.types";
import { formsRepository } from "../../repositories/forms.repository";
import { companiesRepository } from "../../repositories/companies.repository";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../../components/Modal";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Button } from "../../components/Button";

export default function AdminFormsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modal crear/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // modal eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);

  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // form state
  const [formData, setFormData] = useState({
    form_name: "",
    description: "",
    target_type: "", // PERSONA | EMPRESA
  });

  const targetTypeOptions = [
    { value: "PERSONA", label: "Persona" },
    { value: "EMPRESA", label: "Empresa" },
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (user?.company_id) {
          // empresa del ADMIN
          const company = await companiesRepository.getById(user.company_id);
          setCompanyName(company?.name || "");
          setCompanyLogo(company?.logo_url || null);

          // formularios de esa empresa
          const data = await formsRepository.getAll({ owner_company_id: user.company_id });
          setForms(data);
        } else {
          setForms([]);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar formularios");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.company_id]);

  function openCreateModal() {
    setEditingForm(null);
    setFormData({
      form_name: "",
      description: "",
      target_type: "",
    });
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  }

  function openEditModal(form: Form) {
    setEditingForm(form);
    setFormData({
      form_name: form.form_name,
      description: form.description || "",
      target_type: form.target_type,
    });
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingForm(null);
  }

  function openDeleteModal(form: Form) {
    setFormToDelete(form);
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
    setFormToDelete(null);
  }

  async function reload() {
    if (!user?.company_id) return;
    const data = await formsRepository.getAll({ owner_company_id: user.company_id });
    setForms(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !user.company_id) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingForm) {
        await formsRepository.update(editingForm.id, {
          form_name: formData.form_name,
          description: formData.description,
          target_type: formData.target_type as any,
          owner_company_id: user.company_id,
        });
        setSuccess("Formulario actualizado exitosamente");
      } else {
        await formsRepository.create({
          form_name: formData.form_name,
          description: formData.description,
          target_type: formData.target_type as any,
          owner_company_id: user.company_id, // 🔒 fijado a la empresa del ADMIN
          created_by: user.id,
        });
        setSuccess("Formulario creado exitosamente");
      }
      closeModal();
      await reload();
    } catch (err: any) {
      setError(err.message || "Error al guardar formulario");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!formToDelete) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await formsRepository.delete(formToDelete.id);
      setSuccess("Formulario eliminado exitosamente");
      await reload();
      closeDeleteModal();
    } catch (err: any) {
      setError(err.message || "Error al eliminar formulario");
    } finally {
      setDeleting(false);
    }
  }

  const TipoBadge = ({ type }: { type: "PERSONA" | "EMPRESA" }) => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
      {type === "PERSONA" ? <UserRound className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
      {type === "PERSONA" ? "Persona" : "Empresa"}
    </span>
  );

  return (
    <DashboardLayout title="Gestión de Formularios">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/admin/dashboard" className="hover:text-gray-700 transition-colors">Inicio</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/admin/dashboard" className="hover:text-gray-700 transition-colors">Admin</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Formularios</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <Link to="/admin/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1 mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Volver al Panel
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Formularios</h2>
            <p className="text-gray-600">Formularios de tu empresa</p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Formulario
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Cargando formularios...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-[1]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formulario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versión</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha creación</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {forms.map((form) => (
                      <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                        {/* Formulario */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/superadmin/forms/${form.id}`)} // el builder único
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          >
                            {form.form_name}
                          </button>
                          {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
                        </td>

                        {/* Empresa (logo + nombre) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {companyLogo ? (
                              <img src={companyLogo} alt="" className="w-8 h-8 rounded object-contain bg-white border" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 border flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <span className="text-sm text-gray-700 font-medium">{companyName || "—"}</span>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <TipoBadge type={form.target_type as any} />
                        </td>

                        {/* Campos */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {form.fields_count ?? 0}
                        </td>

                        {/* Versión */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          v{form.version || 1}
                        </td>

                        {/* Fecha */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(form.created_at).toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" })}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(form)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(form)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingForm ? "Editar Formulario" : "Nuevo Formulario"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Formulario"
            type="text"
            value={formData.form_name}
            onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
            required
            placeholder="Ej: Formulario de Ingreso Personal"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el propósito de este formulario..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <Select
            label="Tipo de Target"
            value={formData.target_type}
            onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
            options={targetTypeOptions}
            required
          />

          {/* Empresa fija visual (no editable) */}
          <div className="text-sm text-gray-600">
            <span className="block font-medium text-gray-700 mb-1">Empresa Propietaria</span>
            <div className="flex items-center gap-2">
              {companyLogo ? (
                <img src={companyLogo} className="w-6 h-6 object-contain border rounded bg-white" />
              ) : (
                <Building2 className="w-4 h-4 text-gray-500" />
              )}
              <span>{companyName || "—"}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Se usará automáticamente la empresa del administrador.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {editingForm ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirmar Eliminación">
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">¿Eliminar este formulario?</h3>
              {formToDelete && <p className="text-sm text-red-800">"{formToDelete.form_name}"</p>}
              <p className="text-sm text-red-700 mt-2">Se eliminarán campos y datos asociados.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeDeleteModal} className="flex-1" disabled={deleting}>
              Cancelar
            </Button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 gap-2"
            >
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Eliminando...</> : <><Trash2 className="w-4 h-4" /> Eliminar</>}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
