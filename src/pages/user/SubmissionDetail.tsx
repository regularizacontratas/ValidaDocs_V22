import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Clock,
  Brain,
} from 'lucide-react';
import { formsRepository } from '../../repositories/forms.repository';

// --- Tipos (Sin cambios) ---
type SubmissionStatus =
  | 'DRAFT'
  | 'PENDING_AI_VALIDATION'
  | 'AI_VALIDATED'
  | 'AI_VALIDATION_FAILED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

interface SubmissionField {
  fieldId?: string;
  label: string;
  value?: string | number | boolean | null;
}

interface SubmissionFile {
  label?: string;
  name?: string;
  url: string;
}

interface SubmissionDetailDTO {
  id: string;
  formName: string;
  formDescription?: string | null;
  status: SubmissionStatus;
  submittedAt?: string | null;
  updatedAt?: string | null;
  fields?: SubmissionField[];
  files?: SubmissionFile[];
}

interface FieldValidation {
  field_id?: string;
  label: string;
  is_valid: boolean;
  confidence?: number; // 0..1
  notes?: string;
}

type AIRecommendation = 'APPROVE' | 'REVIEW' | 'REJECT';

interface AIValidationDTO {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  overall_score?: number | string; // 0..1
  recommendation?: AIRecommendation;
  processed_at?: string;
  ai_results?: {
    field_validations?: FieldValidation[];
  };
  issues_found?: string[];
}

// --- Componente ---
export function SubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState<SubmissionDetailDTO | null>(null);
  const [aiValidation, setAIValidation] = useState<AIValidationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProcessingMessage, setShowProcessingMessage] = useState(
    location.state?.showProcessingMessage || false
  );

  // Auto-ocultar mensaje de procesamiento después de 5 segundos
  useEffect(() => {
    if (showProcessingMessage) {
      const timer = setTimeout(() => {
        setShowProcessingMessage(false);
        // Limpiar el state para que no aparezca si se recarga
        window.history.replaceState({}, document.title);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showProcessingMessage]);

  const loadSubmissionDetail = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null); // Limpiar errores previos
    try {
      // ✅ Carga de datos en paralelo para mayor eficiencia
      const [submissionData, validationData] = await Promise.all([
        formsRepository.getSubmissionDetail(submissionId),
        formsRepository.getAIValidation(submissionId),
      ]);
      setSubmission(submissionData ?? null);
      setAIValidation(validationData ?? null);
    } catch (err) {
      console.error('Error loadSubmissionDetail:', err);
      setError('No se pudo cargar la información del envío. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadSubmissionDetail();
  }, [loadSubmissionDetail]);

  // ✅ Lógica de polling para verificar el estado de la validación
  const pollValidationStatus = useCallback(
    (attempts = 0) => {
      // Límite de 20 intentos (1 minuto si el intervalo es de 3s)
      if (attempts > 20) {
        setError('La validación de la IA está tardando demasiado. Intenta recargar la página.');
        setValidating(false);
        return;
      }

      setTimeout(async () => {
        try {
          const validation = await formsRepository.getAIValidation(submissionId!);
          // Si la validación terminó (completada o fallida), recarga todo y detente.
          if (validation?.status === 'COMPLETED' || validation?.status === 'FAILED') {
            await loadSubmissionDetail(); // Recarga todo para consistencia
            setValidating(false);
          } else {
            // Si no, sigue intentando
            pollValidationStatus(attempts + 1);
          }
        } catch (err) {
          console.error('Error durante el polling:', err);
          setError('Ocurrió un error al verificar el estado de la validación.');
          setValidating(false);
        }
      }, 3000); // Revisa cada 3 segundos
    },
    [submissionId, loadSubmissionDetail]
  );

  const handleAIValidation = async () => {
    if (!submissionId) return;
    setValidating(true);
    setError(null);
    try {
      await formsRepository.submitForAIValidation(submissionId);
      // Inicia el polling para verificar el resultado
      pollValidationStatus();
    } catch (err) {
      console.error('Error submitForAIValidation:', err);
      setError('No se pudo iniciar el proceso de validación.');
      setValidating(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!submissionId) return;
    try {
      await formsRepository.submitForHumanReview(submissionId);
      await loadSubmissionDetail(); // Recarga los datos tras la acción
    } catch (err) {
      console.error('Error al enviar a revisión:', err);
      setError('Hubo un problema al enviar para revisión. Inténtalo de nuevo.');
    }
  };

  // --- Helpers UI (Sin cambios, ya estaban bien) ---
  const StatusBadge = ({ status }: { status?: SubmissionStatus }) => {
    const map = {
        DRAFT: { cls: 'bg-gray-100 text-gray-800', Icon: FileText, label: 'Borrador' },
        PENDING_AI_VALIDATION: { cls: 'bg-yellow-100 text-yellow-800', Icon: Clock, label: 'Validando IA...' },
        AI_VALIDATED: { cls: 'bg-blue-100 text-blue-800', Icon: CheckCircle, label: 'IA Validó' },
        AI_VALIDATION_FAILED: { cls: 'bg-red-100 text-red-800', Icon: XCircle, label: 'Error IA' },
        SUBMITTED: { cls: 'bg-blue-100 text-blue-800', Icon: Send, label: 'Enviado' },
        APPROVED: { cls: 'bg-green-100 text-green-800', Icon: CheckCircle, label: 'Aprobado' },
        REJECTED: { cls: 'bg-red-100 text-red-800', Icon: XCircle, label: 'Rechazado' },
      } as const;

      const conf = (status && map[status]) || map.DRAFT;
      const Icon = conf.Icon;
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${conf.cls}`}>
          <Icon className="w-4 h-4 mr-1" />
          {conf.label}
        </span>
      );
  };

  const scoreNumber = useMemo(() => {
    const raw = aiValidation?.overall_score;
    if (raw === undefined || raw === null) return null;
    const n = typeof raw === 'string' ? parseFloat(raw) : raw;
    if (!Number.isFinite(n)) return null;
    return Math.min(Math.max(n as number, 0), 1);
  }, [aiValidation?.overall_score]);

  const scoreColor = (score: number | null) => {
    if (score == null) return 'text-gray-500';
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const RecommendationBadge = ({ rec }: { rec?: AIRecommendation }) => {
    const map = {
      APPROVE: { cls: 'bg-green-100 text-green-800', label: 'Aprobar' },
      REVIEW: { cls: 'bg-yellow-100 text-yellow-800', label: 'Revisar' },
      REJECT: { cls: 'bg-red-100 text-red-800', label: 'Rechazar' },
    } as const;
    const target = (rec && map[rec]) || map.REVIEW;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${target.cls}`}>
        {target.label}
      </span>
    );
  };
  
  // --- Renderizado ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ✅ Muestra un mensaje de error si no se encontró el envío
  if (!submission) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-semibold">Envío no encontrado</h1>
            <p className="text-gray-600 mt-2">
                {error || 'No pudimos encontrar los detalles para este envío.'}
            </p>
            <button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Volver
            </button>
      </div>
    );
  }

  // ✅ Lógica de fecha mejorada
  const displayDate = submission.submittedAt || submission.updatedAt;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>

      {/* Mensaje de procesamiento en segundo plano */}
      {showProcessingMessage && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-blue-600 mr-3 animate-pulse" />
              <div>
                <p className="text-blue-900 font-medium">
                  Procesamiento en segundo plano
                  {location.state?.timedOut && <span className="ml-2 text-xs">(Procesamiento extendido)</span>}
                </p>
                <p className="text-blue-700 text-sm">
                  Tu documento está siendo analizado. Te notificaremos cuando esté listo.
                  Puedes recargar esta página en cualquier momento para ver los resultados.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowProcessingMessage(false);
                window.history.replaceState({}, document.title);
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1 ml-4 flex-shrink-0"
              aria-label="Cerrar mensaje"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ✅ Componente para mostrar errores de forma clara */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Ocurrió un error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{submission.formName}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {displayDate
                  ? `Última actualización: ${new Date(displayDate).toLocaleString()}`
                  : 'Aún no guardado'}
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
        </div>

        {/* --- Renderizado de resultados IA, campos y archivos (sin cambios estructurales) --- */}

        {aiValidation?.status === 'COMPLETED' && (
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                Resultados de Validación IA
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Score General</p>
                <p className={`text-2xl font-bold ${scoreColor(scoreNumber)}`}>
                    {scoreNumber != null ? `${(scoreNumber * 100).toFixed(0)}%` : '-'}
                </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Recomendación</p>
                <div className="mt-1">
                    <RecommendationBadge rec={aiValidation?.recommendation} />
                </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Procesado</p>
                <p className="text-sm font-medium">
                    {aiValidation?.processed_at ? new Date(aiValidation.processed_at).toLocaleString() : '-'}
                </p>
                </div>
            </div>

            {Array.isArray(aiValidation?.ai_results?.field_validations) &&
                aiValidation.ai_results.field_validations.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Validación de Campos:</h3>
                    <div className="space-y-2">
                    {aiValidation.ai_results.field_validations.map((field, idx) => (
                        <div key={field.field_id ?? idx} className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center">
                            {field.is_valid ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-500 mr-3" />
                            )}
                            <div>
                            <p className="font-medium text-sm">{field.label}</p>
                            {field.notes ? <p className="text-xs text-gray-500">{field.notes}</p> : null}
                            </div>
                        </div>
                        <span className="text-sm text-gray-600">
                            {typeof field.confidence === 'number' ? `${(field.confidence * 100).toFixed(0)}%` : '-'}
                        </span>
                        </div>
                    ))}
                    </div>
                </div>
            )}
            
            {Array.isArray(aiValidation?.issues_found) && aiValidation.issues_found.length > 0 && (
              <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Observaciones:</h3>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {aiValidation.issues_found.map((issue, idx) => (
                    <li key={`${issue}-${idx}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información</h2>
          <div className="space-y-4">
            {Array.isArray(submission?.fields) && submission.fields.length > 0 ? (
                submission.fields.map((field, idx) => (
                    <div key={field.fieldId ?? idx}>
                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                    <p className="mt-1 text-sm text-gray-900">{String(field.value ?? '-')}</p>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500">No hay información para mostrar.</p>
            )}
          </div>
        </div>

        {Array.isArray(submission.files) && submission.files.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Archivos ({submission.files.length})</h2>
            <div className="space-y-3">
              {submission.files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.label ?? 'Archivo'}</p>
                    <p className="text-xs text-gray-500 break-all">{file.name ?? file.url}</p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    Ver archivo
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <div className="flex gap-3">
            {submission.status === 'DRAFT' && (
              <button
                onClick={handleAIValidation}
                disabled={validating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Análisis IA
                  </>
                )}
              </button>
            )}

            {submission.status === 'AI_VALIDATED' && (
              <button
                onClick={handleSubmitForReview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar para Revisión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}