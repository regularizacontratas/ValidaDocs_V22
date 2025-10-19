import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ArrowLeft, ChevronRight, Loader2, AlertCircle, Building2, Calendar, FileText, Hash, Plus, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle, ChevronUp, ChevronDown, Eye, Sparkles } from 'lucide-react';
import { Form, FormField } from '../../types/database.types';
import { formsRepository } from '../../repositories/forms.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';

export function FormBuilder() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<FormField | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldData, setFieldData] = useState({
    label: '',
    type: '',
    required: false,
    placeholder_text: '',
    ai_validation_prompt: '',
  });

  useEffect(() => {
    if (formId) {
      loadFormAndFields();
    }
  }, [formId]);

  async function loadFormAndFields() {
    try {
      setLoading(true);
      const data = await formsRepository.getFormWithFields(formId!);
      
      if (!data.form) {
        setError('Formulario no encontrado');
        return;
      }
      
      setForm(data.form);
      setFields(data.fields);
      
      const company = await companiesRepository.getById(data.form.owner_company_id);
      if (company) {
        setCompanyName(company.name);
      }
      
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar formulario');
      console.error('Error cargando formulario:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateFieldModal() {
    setEditingField(null);
    setFieldData({
      label: '',
      type: '',
      required: false,
      placeholder_text: '',
      ai_validation_prompt: 'Buscar el valor del campo dentro del documento',
    });
    setShowAiPrompt(false);
    setIsFieldModalOpen(true);
    setError('');
    setSuccess('');
  }

  function openEditFieldModal(field: FormField) {
    setEditingField(field);
    setFieldData({
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder_text: field.placeholder_text || '',
      ai_validation_prompt: field.ai_validation_prompt || 'Buscar el valor del campo dentro del documento',
    });
    setShowAiPrompt(false);
    setIsFieldModalOpen(true);
    setError('');
    setSuccess('');
  }

  function closeFieldModal() {
    setIsFieldModalOpen(false);
    setEditingField(null);
    setShowAiPrompt(false);
  }

  function openDeleteModal(field: FormField) {
    setFieldToDelete(field);
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
    setFieldToDelete(null);
  }

  function openPreview() {
    setIsPreviewOpen(true);
  }

  function closePreview() {
    setIsPreviewOpen(false);
  }

  async function handleFieldSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const fieldPayload = {
        label: fieldData.label,
        type: fieldData.type as any,
        required: fieldData.required,
        placeholder_text: fieldData.placeholder_text || null,
        ai_validation_prompt: fieldData.ai_validation_prompt || 'Buscar el valor del campo dentro del documento',
      };

      if (editingField) {
        await formsRepository.updateField(editingField.id, fieldPayload);
        setSuccess('Campo actualizado exitosamente');
      } else {
        const nextOrder = fields.length > 0 
          ? Math.max(...fields.map(f => f.field_order)) + 1 
          : 1;

        await formsRepository.createField({
          form_id: formId!,
          ...fieldPayload,
          field_order: nextOrder,
        });
        setSuccess('Campo creado exitosamente');
      }

      closeFieldModal();
      await loadFormAndFields();
    } catch (err: any) {
      setError(err.message || 'Error al guardar campo');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!fieldToDelete) return;

    setDeleting(true);
    try {
      await formsRepository.deleteField(fieldToDelete.id);
      setSuccess('Campo eliminado exitosamente');
      await loadFormAndFields();
      closeDeleteModal();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar campo');
    } finally {
      setDeleting(false);
    }
  }

  async function moveFieldUp(field: FormField) {
    const currentIndex = fields.findIndex(f => f.id === field.id);
    if (currentIndex === 0) return;

    const prevField = fields[currentIndex - 1];

    try {
      await formsRepository.updateField(field.id, { field_order: prevField.field_order });
      await formsRepository.updateField(prevField.id, { field_order: field.field_order });
      await loadFormAndFields();
    } catch (err: any) {
      setError('Error al reordenar campos');
    }
  }

  async function moveFieldDown(field: FormField) {
    const currentIndex = fields.findIndex(f => f.id === field.id);
    if (currentIndex === fields.length - 1) return;

    const nextField = fields[currentIndex + 1];

    try {
      await formsRepository.updateField(field.id, { field_order: nextField.field_order });
      await formsRepository.updateField(nextField.id, { field_order: field.field_order });
      await loadFormAndFields();
    } catch (err: any) {
      setError('Error al reordenar campos');
    }
  }

  function getFieldTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'text': 'Texto',
      'textarea': 'Texto Largo',
      'number': 'Número',
      'date': 'Fecha',
      'email': 'Correo Electrónico',
      'phone': 'Teléfono',
      'file': 'Archivo',
      'select': 'Selección',
      'checkbox': 'Casilla',
      'radio': 'Opción Única',
    };
    return labels[type] || type;
  }

  function renderPreviewField(field: FormField) {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    const placeholder = field.placeholder_text || `Ingrese ${field.label.toLowerCase()}`;
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return <input type={field.type} className={baseClasses} placeholder={placeholder} disabled />;
      case 'textarea':
        return <textarea rows={3} className={baseClasses} placeholder={placeholder} disabled />;
      case 'date':
        return <input type="date" className={baseClasses} disabled />;
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" disabled />
            <span className="text-sm text-gray-600">{placeholder || 'Acepto'}</span>
          </div>
        );
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">{placeholder || 'Haga clic para seleccionar archivo'}</p>
          </div>
        );
      case 'select':
        return (
          <select className={baseClasses} disabled>
            <option>{placeholder || 'Seleccione una opción'}</option>
          </select>
        );
      default:
        return <input type="text" className={baseClasses} placeholder={placeholder} disabled />;
    }
  }

  const fieldTypeOptions = [
    { value: 'text', label: 'Texto' },
    { value: 'textarea', label: 'Texto Largo' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'email', label: 'Correo Electrónico' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'file', label: 'Archivo' },
    { value: 'select', label: 'Selección' },
    { value: 'checkbox', label: 'Casilla' },
    { value: 'radio', label: 'Opción Única' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Constructor de Formularios">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !form) {
    return (
      <DashboardLayout title="Constructor de Formularios">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error || 'Formulario no encontrado'}</p>
          </div>
          <button
            onClick={() => navigate('/superadmin/forms')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Formularios
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Constructor: ${form.form_name}`}>
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
          <Link to="/superadmin/forms" className="hover:text-gray-700 transition-colors">
            Formularios
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{form.form_name}</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/superadmin/forms"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Formularios
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {form.form_name}
            </h2>
            <p className="text-gray-600">
              {form.description || 'Constructor de campos del formulario'}
            </p>
          </div>
          {fields.length > 0 && (
            <button
              onClick={openPreview}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors gap-2"
            >
              <Eye className="w-5 h-5" />
              Vista Previa
            </button>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Información del Formulario
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tipo de Target
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {form.target_type === 'PERSONA' ? 'Persona' : 'Empresa'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Empresa Propietaria
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {companyName || 'Cargando...'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Versión
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    v{form.version || 1}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Fecha de Creación
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(form.created_at).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Campos del Formulario ({fields.length})
            </h3>
            <button
              onClick={openCreateFieldModal}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Campo
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay campos definidos
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando campos para construir tu formulario
              </p>
              <button
                onClick={openCreateFieldModal}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar Primer Campo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requerido
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                            {field.field_order}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveFieldUp(field)}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Subir"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveFieldDown(field)}
                              disabled={index === fields.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Bajar"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {field.label}
                        </p>
                        {field.placeholder_text && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {field.placeholder_text}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                          {getFieldTypeLabel(field.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {field.required ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditFieldModal(field)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(field)}
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
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={closeFieldModal}
        title={editingField ? 'Editar Campo' : 'Agregar Campo'}
      >
        <form onSubmit={handleFieldSubmit} className="space-y-4">
          <Input
            label="Etiqueta del Campo"
            type="text"
            value={fieldData.label}
            onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
            required
            placeholder="Ej: Nombre Completo"
          />

          <Select
            label="Tipo de Campo"
            value={fieldData.type}
            onChange={(e) => setFieldData({ ...fieldData, type: e.target.value })}
            options={fieldTypeOptions}
            required
          />

          <Input
            label="Texto de Ayuda (Placeholder)"
            type="text"
            value={fieldData.placeholder_text}
            onChange={(e) => setFieldData({ ...fieldData, placeholder_text: e.target.value })}
            placeholder="Ej: Ingrese primer y segundo nombre"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={fieldData.required}
              onChange={(e) => setFieldData({ ...fieldData, required: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="required" className="text-sm font-medium text-gray-700">
              Campo requerido
            </label>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {showAiPrompt ? 'Ocultar' : 'Configurar'} Prompt de IA
            </button>
            
            {showAiPrompt && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt de Validación IA
                  <span className="text-gray-500 font-normal ml-2">(Opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={fieldData.ai_validation_prompt}
                  onChange={(e) => setFieldData({ ...fieldData, ai_validation_prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  placeholder="Buscar el valor del campo dentro del documento"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este prompt guiará a la IA en la extracción del valor del campo.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeFieldModal}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {editingField ? 'Actualizar' : 'Crear Campo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar */}
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
                ¿Estás seguro de eliminar este campo?
              </h3>
              {fieldToDelete && (
                <p className="text-sm text-red-800">
                  <span className="font-medium">"{fieldToDelete.label}"</span>
                </p>
              )}
              <p className="text-sm text-red-700 mt-2">
                Esta acción no se puede deshacer.
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
                  Eliminar Campo
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Vista Previa */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        title={`Vista Previa: ${form.form_name}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-6">
          {form.description && (
            <p className="text-sm text-gray-600 mb-6">{form.description}</p>
          )}
          {fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderPreviewField(field)}
            </div>
          ))}
          <div className="pt-4">
            <button
              type="button"
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              disabled
            >
              Enviar Formulario
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}