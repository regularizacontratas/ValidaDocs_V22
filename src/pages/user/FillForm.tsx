import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Save,
  Sparkles,
  AlertCircle,
  Upload,
  X,
  FileText,
  Zap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formSubmissionsRepository } from '../../repositories/submissions.repository';
import { formsRepository } from '../../repositories/forms.repository';
import { FormField } from '../../types/database.types';
import { fileAttachmentsRepository } from '../../repositories/file-attachments.repository';
import { AIProcessingModal } from '../../components/AIProcessingModal';
import { Modal } from '../../components/Modal';

interface FormValues {
  [fieldId: string]: string | boolean | File | null;
}

export function FillForm() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submissionId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [existingFiles, setExistingFiles] = useState<{ [fieldId: string]: any }>({});
  const [errors, setErrors] = useState<{ [fieldId: string]: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);


  // Estados para el llenado rápido por JSON
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickFillJson, setQuickFillJson] = useState('');
  const [quickFillError, setQuickFillError] = useState('');

  useEffect(() => {
    loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, submissionId]);

  async function loadForm() {
    try {
      if (!formId) return;

      const data = await formsRepository.getFormWithFields(formId);

      if (data.form) {
        setFormName(data.form.form_name);
        setFormDescription(data.form.description || '');
        setFields(data.fields);

        const initialValues: FormValues = {};
        data.fields.forEach((field) => {
          if (field.type === 'checkbox') {
            initialValues[field.id] = false;
          } else if (field.type === 'file') {
            initialValues[field.id] = null;
          } else {
            initialValues[field.id] = '';
          }
        });

        if (submissionId) {
          try { // Cargar datos de un borrador existente
            const { data: submissionData, error: submissionError } = await supabase
              .from('form_submissions')
              .select('values_json')
              .eq('id', submissionId)
              .single();
            if (submissionError) throw submissionError;

            if (submissionData?.values_json) {
              Object.assign(initialValues, submissionData.values_json);
            } 

            // Cargar archivos adjuntos desde la tabla correcta
            const { data: attachments } = await fileAttachmentsRepository.getBySubmission(submissionId);
            if (attachments && attachments.length > 0) {
              const filesMap = attachments.reduce((acc: { [fieldId: string]: any }, att) => {
                acc[att.field_id] = att; // Agrupar por field_id
                return acc;
              }, {});
              setExistingFiles(filesMap); // Actualizar el estado fuera del reduce
            }
          } catch (err) {
            console.error('Error cargando borrador:', err);
          }
        }

        setValues(initialValues);
      }
    } catch (err) {
      console.error('Error loading form:', err);
      setSubmitError('Error al cargar el formulario');
    } finally {
      setLoading(false);
    }
  }

  const handleFieldChange = (fieldId: string, value: string | boolean | File | null) => {
    setValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    handleFieldChange(fieldId, file);

    if (file && existingFiles[fieldId]) {
      setExistingFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [fieldId: string]: string } = {};

    fields.forEach((field) => {
      if (field.required) {
        const value = values[field.id];

        if (field.type === 'file') {
          if (!value && !existingFiles[field.id]) {
            newErrors[field.id] = 'Debe adjuntar un archivo';
          }
        } else if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.id] = 'Este campo es requerido';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAIProcessingComplete = () => {
    setShowAIProcessing(false);
    if (currentSubmissionId) {
      navigate(`/user/submissions/${currentSubmissionId}`, {
        state: { showProcessingMessage: true }
      });
    }
  };

  /** Abre el modal de llenado rápido */
  const openQuickFill = () => {
    setQuickFillError('');
    setQuickFillJson('');
    setShowQuickFill(true);
  };

  /** Cierra el modal de llenado rápido */
  const closeQuickFill = () => {
    setShowQuickFill(false);
    setQuickFillError('');
    setQuickFillJson('');
  };

  /**
   * Aplica el JSON pegado para autocompletar el formulario.
   * El JSON debe tener como claves las etiquetas (label) de los campos.
   */
  const applyQuickFill = () => {
    setQuickFillError('');
    let parsed: any;
    try {
      parsed = JSON.parse(quickFillJson);
    } catch (e) {
      setQuickFillError('JSON inválido');
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      setQuickFillError('El JSON debe representar un objeto');
      return;
    }

    /**
     * Intenta interpretar un valor de fecha en formato desconocido y lo convierte a
     * una cadena ISO (YYYY-MM-DD). Soporta formatos comunes como:
     *  - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
     *  - YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
     *  - MM/DD/YY o DD/MM/YY (se infiere por heurística si el día > 12).
     *  - Valores con dos dígitos de año se interpretan en el siglo actual (20xx) si están
     *    por debajo de 50, de lo contrario se asumen como 19xx.
     * Devuelve null si no se puede interpretar.
     */
    const parseDateValue = (raw: any): string | null => {
      if (typeof raw !== 'string') return null;
      const value = raw.trim();
      if (!value) return null;
      // No intentar parsear textos no relacionados con fechas,
      // por ejemplo "Indefinido" u otros textos no numéricos
      const containsDigit = /\d/.test(value);
      if (!containsDigit) return null;

      // Reemplaza separadores comunes por espacio
      const cleaned = value
        .replace(/[\.\/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const parts = cleaned.split(' ');
      if (parts.length < 3) {
        // Un intento adicional: formato YYYYMMDD o DDMMYYYY
        if (parts.length === 1 && /^(\d{8})$/.test(parts[0])) {
          const digits = parts[0];
          // Asumir YYYYMMDD (8 dígitos)
          const year = digits.slice(0, 4);
          const month = digits.slice(4, 6);
          const day = digits.slice(6, 8);
          return `${year}-${month}-${day}`;
        }
        return null;
      }

      // Convierte a números
      const nums = parts.map((p) => parseInt(p, 10));
      // Identifica el año: parte con 4 dígitos o >31
      let yearIndex = nums.findIndex((n) => String(n).length === 4 || n > 31);
      if (yearIndex === -1) {
        // No se encontró un año claro; si la última parte es de 2 dígitos la usamos como año
        yearIndex = 2;
      }
      const yearRaw = nums[yearIndex];
      let year: number;
      if (String(yearRaw).length === 4) {
        year = yearRaw;
      } else if (yearRaw >= 100) {
        // Valores como 99 o 2025 se tratarán como año
        year = yearRaw;
      } else {
        // Año con dos dígitos; <50 -> 2000+; ≥50 -> 1900+
        year = yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw;
      }
      // Resto de índices para día y mes
      const remaining = nums.filter((_, idx) => idx !== yearIndex);
      if (remaining.length < 2) return null;
      let [a, b] = remaining;
      let day: number;
      let month: number;
      // Si un valor es >12 se toma como día
      if (a > 12 && b <= 12) {
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        day = b;
        month = a;
      } else {
        // Ambos ≤12; asumimos día = a, mes = b
        day = a;
        month = b;
      }
      // Ajusta ceros
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const isoDate = `${year}-${mm}-${dd}`;
      // Verificar fecha válida
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return null;
      // Asegurar que no hay desfase (p. ej., 31/02)
      const checkMonth = d.getMonth() + 1;
      const checkDay = d.getDate();
      if (checkMonth !== month || checkDay !== day) return null;
      return isoDate;
    };

    fields.forEach((field) => {
      // No autocompletar archivos
      if (field.type === 'file') return;
      const key = field.label;
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        const value = parsed[key];
        if (field.type === 'checkbox') {
          // Para checkbox esperamos booleano
          if (typeof value === 'boolean') {
            handleFieldChange(field.id, value);
          }
        } else if (field.type === 'date') {
          // Intenta convertir la fecha a formato ISO
          const iso = parseDateValue(value);
          if (iso) {
            handleFieldChange(field.id, iso);
          } else if (value !== null && value !== undefined) {
            // Si no se pudo interpretar, asigna el valor como cadena
            handleFieldChange(field.id, String(value));
          }
        } else {
          // Otros tipos: asignar como cadena
          if (value !== null && value !== undefined) {
            handleFieldChange(field.id, String(value));
          }
        }
      }
    });
    // Cerrar modal tras aplicar
    setShowQuickFill(false);
  };

  // Safety timeout para evitar que el usuario se quede atascado en el modal de IA
  useEffect(() => {
    if (showAIProcessing) {
      const timeout = setTimeout(() => {
        if (showAIProcessing) {
          setShowAIProcessing(false);
          if (currentSubmissionId) {
            navigate(`/user/submissions/${currentSubmissionId}`, {
              state: { showProcessingMessage: true, timedOut: true }
            });
          }
        }
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [showAIProcessing, currentSubmissionId, navigate]);

  const handleSubmit = async (isDraft: boolean = false) => {
    setSubmitError('');
    setSubmitSuccess(false);

    if (!isDraft && !validateForm()) {
      setSubmitError('Por favor completa todos los campos requeridos');
      return;
    }

    setSaving(true);

    try {
      if (!formId || !user?.id || !user?.company_id) {
        throw new Error('Faltan datos del usuario o formulario');
      }

      // 1. Crear o encontrar la submission
      let finalSubmissionId = submissionId;
      if (!finalSubmissionId) {
        const newSubmission = await formSubmissionsRepository.createDraft(formId, user.company_id || user.id, user.id);
        finalSubmissionId = newSubmission.id;
      }

      // 2. Subir nuevos archivos y crear registros en `file_attachments`
      const fileFields = fields.filter((field) => field.type === 'file');
      for (const field of fileFields) {
        const file = values[field.id] as File | null;
        if (file) {
          await fileAttachmentsRepository.uploadAndCreateRecord(
            file,
            finalSubmissionId,
            field.id,
            user.id
          );
        }
      }

      // 3. Actualizar los valores de texto y el estado
      const fieldValues: { [fieldId: string]: string | boolean } = {};
      fields
        .filter((field) => field.type !== 'file')
        .forEach((field) => {
          const value = values[field.id];
          fieldValues[field.id] = value as string | boolean;
        });

      await formSubmissionsRepository.update(finalSubmissionId, {
        values_json: fieldValues,
        status: isDraft ? 'DRAFT' : 'PENDING_AI_VALIDATION',
      });

      setCurrentSubmissionId(finalSubmissionId);

      if (!isDraft) {
        // Enviar a validación IA
        await formsRepository.submitForAIValidation(finalSubmissionId);
        setSaving(false);
        // Mostrar modal de procesamiento
        setShowAIProcessing(true);
      } else {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/user/dashboard'); // Redirigir al dashboard principal del usuario
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving submission:', err);
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar el formulario');
      setSaving(false);
    } finally {
      if (isDraft) {
        setSaving(false);
      }
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.id];
    const error = errors[field.id];
    const hasError = !!error;
    const existingFile = existingFiles[field.id];

    const baseInputClasses = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder_text || `Ingrese ${field.label.toLowerCase()}`}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder_text || `Ingrese ${field.label.toLowerCase()}`}
              rows={4}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder_text || `Ingrese ${field.label.toLowerCase()}`}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );

      case 'select':
        const options = field.options ? JSON.parse(field.options as string) : [];
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={baseInputClasses}
            >
              <option value="">Seleccione una opción</option>
              {options.map((option: string, index: number) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'file':
        const file = value as File | null;
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {existingFile && !file && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900" title={existingFile.file_name}>
                      {existingFile.label || 'Archivo guardado'}
                    </p>
                    <a
                      href={existingFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver archivo
                    </a>
                  </div>
                </div>
              </div>
            )}

            {!file ? (
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload
                    className={`w-10 h-10 mb-3 ${
                      hasError ? 'text-red-400' : 'text-gray-400'
                    }`}
                  />
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click para subir</span> o arrastra aquí
                  </p>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      if (selectedFile.size > 10 * 1024 * 1024) {
                        setErrors((prev) => ({
                          ...prev,
                          [field.id]: 'El archivo no debe superar 10MB',
                        }));
                        return;
                      }
                      handleFileChange(field.id, selectedFile);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileChange(field.id, null)}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}

            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Tipo de campo "{field.type}" no soportado aún
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <AIProcessingModal
        isOpen={showAIProcessing}
        onComplete={handleAIProcessingComplete}
        duration={7}
      />
      {/* Modal de llenado rápido */}
      <Modal
        isOpen={showQuickFill}
        onClose={closeQuickFill}
        title="Llenado rápido"
      >
        <div className="space-y-4">
          {quickFillError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
              {quickFillError}
            </div>
          )}
          <textarea
            value={quickFillJson}
            onChange={(e) => setQuickFillJson(e.target.value)}
            placeholder="Pega aquí el JSON con valores para cada campo, usando las etiquetas como claves"
            rows={8}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={closeQuickFill}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={applyQuickFill}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => navigate('/user/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
              {/* Botón de llenado rápido */}
              <button
                type="button"
                onClick={openQuickFill}
                className="absolute top-4 right-4 p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Llenado rápido"
              >
                <Zap className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{formName}</h1>
              {formDescription && <p className="text-gray-600">{formDescription}</p>}
              {submissionId && (
                <p className="text-sm text-blue-600 mt-2">✏️ Editando borrador</p>
              )}
            </div>
          </div>

          {submitSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✓ Formulario guardado exitosamente. Redirigiendo...
              </p>
            </div>
          )}

          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{submitError}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {fields.map((field) => renderField(field))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Guardar Borrador
            </button>

            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Enviar a Análisis IA
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
