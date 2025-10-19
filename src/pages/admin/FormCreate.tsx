import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formsRepository } from '../../repositories/forms.repository';
import { FormField } from '../../types/database.types';

interface FieldConfig {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder_text?: string;
  options?: string;
  order: number;
}

export function FormCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState('PERSONA');
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addField = () => {
    const newField: FieldConfig = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false,
      placeholder_text: '',
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      setError('El nombre del formulario es requerido');
      return;
    }

    if (fields.length === 0) {
      setError('Debes agregar al menos un campo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Crear el formulario
      const form = await formsRepository.create({
        form_name: formName,
        description,
        target_type: targetType,
        owner_company_id: user?.company_id,
        is_active: true,
        version: 1,
      });

      // Crear los campos
      for (const field of fields) {
        await formsRepository.createField({
          form_id: form.id,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder_text: field.placeholder_text,
          options: field.options,
          field_order: field.order,
        });
      }

      // Redirigir a la página de asignación
      navigate(`/admin/forms/${form.id}/assign`);
    } catch (err: any) {
      console.error('Error creando formulario:', err);
      setError(err.message || 'Error al crear el formulario');
    } finally {
      setSaving(false);
    }
  };

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'date', label: 'Fecha' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'select', label: 'Selección' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'file', label: 'Archivo' },
  ];

  return (
    <DashboardLayout title="Crear Formulario">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </button>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Formulario</h2>

          {/* Información básica */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Formulario *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Licencia de Conducir"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe el propósito del formulario..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Objetivo
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PERSONA">Persona</option>
                <option value="EMPRESA">Empresa</option>
                <option value="VEHICULO">Vehículo</option>
                <option value="EQUIPO">Equipo</option>
              </select>
            </div>
          </div>

          {/* Campos del formulario */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Campos del Formulario</h3>
              <button
                onClick={addField}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Campo
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="pt-2">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Etiqueta
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="Nombre del campo"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Tipo
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder_text || ''}
                          onChange={(e) => updateField(field.id, { placeholder_text: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="Texto de ayuda"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-600">Requerido</span>
                      </label>
                      
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay campos agregados</p>
                  <p className="text-sm">Haz clic en "Agregar Campo" para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar y Asignar'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}