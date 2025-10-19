import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import {
  FileText,
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  CheckCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  User,
  Building,
} from 'lucide-react';
import { Form } from '../../types/database.types';
import { formsRepository } from '../../repositories/forms.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

export function FormsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Extend Form with optional fieldCount property
  const [forms, setForms] = useState<(Form & { fieldCount?: number })[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string; logo_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    form_name: '',
    description: '',
    target_type: '',
    owner_company_id: '',
  });

  useEffect(() => {
    loadForms();
    loadCompanies();
  }, []);

  async function loadForms() {
    try {
      setLoading(true);
      const data = await formsRepository.getAll();
      // Para cada formulario obtenemos la cantidad de campos asociados
      const enriched: (Form & { fieldCount?: number })[] = [];
      for (const form of data) {
        const { count, error: countError } = await supabase
          .from('form_fields')
          .select('*', { count: 'exact', head: true })
          .eq('form_id', form.id);
        if (countError) {
          console.error(countError);
        }
        enriched.push({ ...form, fieldCount: count || 0 });
      }
      setForms(enriched);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar formularios');
      console.error('Error cargando formularios:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const data = await companiesRepository.getAll();
      // Asegurarse de incluir logo_url si está presente
      setCompanies(data as any);
    } catch (err: any) {
      console.error('Error cargando empresas:', err);
    }
  }

  function openCreateModal() {
    setEditingForm(null);
    setFormData({
      form_name: '',
      description: '',
      target_type: '',
      owner_company_id: '',
    });
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  }

  function openEditModal(form: Form) {
    setEditingForm(form);
    setFormData({
      form_name: form.form_name,
      description: form.description || '',
      target_type: form.target_type,
      owner_company_id: form.owner_company_id,
    });
    setIsModalOpen(true);
    setError('');
    setSuccess('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingForm) {
        await formsRepository.update(editingForm.id, {
          form_name: formData.form_name,
          description: formData.description,
          target_type: formData.target_type as any,
          owner_company_id: formData.owner_company_id,
        });
        setSuccess('Formulario actualizado exitosamente');
      } else {
        await formsRepository.create({
          form_name: formData.form_name,
          description: formData.description,
          target_type: formData.target_type as any,
          owner_company_id: formData.owner_company_id,
          created_by: user.id,
        });
        setSuccess('Formulario creado exitosamente');
      }

      await loadForms();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar formulario');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!formToDelete) return;

    setDeleting(true);
    try {
      await formsRepository.delete(formToDelete.id);
      setSuccess('Formulario eliminado exitosamente');
      await loadForms();
      closeDeleteModal();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar formulario');
    } finally {
      setDeleting(false);
    }
  }

  const targetTypeOptions = [
    { value: 'PERSONA', label: 'Persona' },
    { value: 'EMPRESA', label: 'Empresa' },
  ];

  const companyOptions = companies.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Devuelve el nombre de la empresa para un formulario
  function getCompany(form: Form) {
    const company = companies.find((c) => c.id === form.owner_company_id);
    return company || null;
  }

  return (
    <DashboardLayout title="Gestión de Formularios">
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/superadmin/dashboard" className="hover:text-gray-700 transition-colors">
            Inicio
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/superadmin/dashboard" className="hover:text-gray-700 transition-colors">
            SuperAdmin
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Formularios</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <Link
              to="/superadmin/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Panel
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gestión de Formularios
            </h2>
            <p className="text-gray-600">
              Administra todos los formularios del sistema
            </p>
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
            {forms.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay formularios registrados
                </h3>
                <p className="text-gray-600">
                  Crea tu primer formulario para comenzar
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Formulario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Versión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha creación
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {forms.map((form) => (
                        <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <button
                                onClick={() => navigate(`/superadmin/forms/${form.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                              >
                                {form.form_name}
                              </button>
                              {form.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {form.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {(() => {
                              const comp = getCompany(form);
                              if (!comp) return null;
                              return (
                                <div className="flex items-center space-x-2">
                                  {comp.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={comp.logo_url}
                                      alt={comp.name}
                                      className="h-6 w-6 object-contain"
                                    />
                                  ) : (
                                    <div className="h-6 w-6 bg-gray-200 rounded-full" />
                                  )}
                                  <span>{comp.name}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {form.target_type === 'PERSONA' ? (
                              <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                <User className="w-3 h-3 mr-1" /> Persona
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                <Building className="w-3 h-3 mr-1" /> Empresa
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {form.fieldCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            v{form.version || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(form.created_at).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
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
            )}
          </>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingForm ? 'Editar Formulario' : 'Nuevo Formulario'}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
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

          <Select
            label="Empresa Propietaria"
            value={formData.owner_company_id}
            onChange={(e) => setFormData({ ...formData, owner_company_id: e.target.value })}
            options={companyOptions}
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {editingForm ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                ¿Estás seguro de eliminar este formulario?
              </h3>
              {formToDelete && (
                <p className="text-sm text-red-800">
                  <span className="font-medium">"{formToDelete.form_name}"</span>
                </p>
              )}
              <p className="text-sm text-red-700 mt-2">
                Esta acción no se puede deshacer. Se eliminarán también todos los campos y datos asociados.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeleteModal}
              className="flex-1"
              disabled={deleting}
            >
              Cancelar
            </Button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar Formulario
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}