// ✅ src/repositories/submissions.repository.ts
import { supabase } from '../lib/supabase';
import { FormSubmission } from '../types/database.types';

/** Buckets conocidos en tu proyecto. Ajusta si usas otros. */
const KNOWN_BUCKETS = ['public', 'documents', 'attachments', 'files', 'avatars'];

/** Bucket por defecto si no se puede inferir del storage_path */
const DEFAULT_BUCKET =
  (import.meta as any)?.env?.VITE_SUPABASE_DEFAULT_BUCKET || 'public';

type AttachmentRow = Record<string, any>;

/**
 * Extrae el bucket y la ruta de un objeto de fila de adjunto.
 * Prioriza columnas explícitas y luego intenta inferir de una URL/ruta completa.
 */
function extractBucketAndPath(row: AttachmentRow): { bucket: string; path: string } | null {
  const explicitBucket = row.bucket || row.storage_bucket || row.bucket_name;
  const explicitPath = row.path || row.storage_key || row.file_path;

  // Caso 1: Columnas explícitas `bucket` y `path` existen.
  if (explicitBucket && explicitPath) {
    return { bucket: String(explicitBucket), path: String(explicitPath).replace(/^\/+/, '') };
  }

  // Caso 2: No hay ruta explícita, intentar derivar de `storage_path` o `url`.
  const fullPath: string | null = row.storage_path || row.url || null;
  if (fullPath) {
    // Eliminar el prefijo de la URL de Supabase para obtener `bucket/path`.
    const pathWithoutHost = fullPath.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//, '');
    const parts = pathWithoutHost.split('/');

    if (parts.length < 2) { // Necesitamos al menos un bucket y un nombre de archivo.
        // Si hay un bucket explícito, lo usamos con la ruta completa.
        if(explicitBucket) return { bucket: String(explicitBucket), path: pathWithoutHost };
        // Si no, usamos el bucket por defecto.
        return { bucket: DEFAULT_BUCKET, path: pathWithoutHost };
    }

    const potentialBucket = parts[0];
    const inferredPath = parts.slice(1).join('/');
    const inferredBucket = KNOWN_BUCKETS.includes(potentialBucket) ? potentialBucket : (explicitBucket || DEFAULT_BUCKET);
    
    return { bucket: inferredBucket, path: inferredPath || pathWithoutHost };
  }

  // No se pudo determinar el bucket o la ruta.
  return null;
}

export const formSubmissionsRepository = {
  // ---------- CRUD básico ----------
  async create(submission: Partial<FormSubmission>): Promise<FormSubmission> {
    const { data, error } = await supabase
      .from('form_submissions')
      .insert(submission)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async createDraft(formId: string, targetId: string, userId: string): Promise<FormSubmission> {
    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        id: crypto.randomUUID(),
        form_id: formId,
        target_id: targetId,
        values_json: {},
        status: 'DRAFT',
        submitted_by: userId,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<FormSubmission>): Promise<FormSubmission> {
    const { data, error } = await supabase
      .from('form_submissions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async saveValues(submissionId: string, values: Record<string, unknown>): Promise<FormSubmission> {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({ values_json: values })
      .eq('id', submissionId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async submitSubmission(submissionId: string): Promise<FormSubmission> {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({ status: 'SUBMITTED' })
      .eq('id', submissionId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<FormSubmission | null> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByFormAndTarget(formId: string, targetId: string): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('target_id', targetId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ---------- Utilidades para borrado limpio ----------
  /** Obtiene adjuntos para poder borrar del Storage (detector flexible de bucket/path). */
  async listAttachments(submissionId: string): Promise<Array<{ bucket: string; path: string }>> {
    // Selecciona * para evitar errores si faltan columnas; mapeamos en memoria.
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('submission_id', submissionId);
    if (error) throw error;

    const out: Array<{ bucket: string; path: string }> = [];
    (data as AttachmentRow[] | null)?.forEach((row) => {
      const parsed = extractBucketAndPath(row);
      if (parsed && parsed.path) out.push(parsed);
    });
    return out;
  },

  /** Remueve en lote del Storage (tolera archivos inexistentes). */
  async deleteStorageFiles(attachments: Array<{ bucket: string; path: string }>): Promise<void> {
    const byBucket: Record<string, string[]> = {};
    for (const a of attachments) {
      if (!byBucket[a.bucket]) byBucket[a.bucket] = [];
      byBucket[a.bucket].push(a.path);
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      if (paths.length === 0) continue;
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        // No bloqueamos la operación completa por un error de storage
        console.warn(`[Storage] remove error in bucket "${bucket}":`, error.message);
      }
    }
  },

  /**
   * Borra completamente una submission:
   * 1) elimina archivos del Storage (si los hay y se pudo inferir bucket/path)
   * 2) borra la fila en form_submissions (hijos caen por CASCADE según FKs)
   */
  async deleteSubmissionCompletely(submissionId: string): Promise<void> {
    try {
      const attachments = await this.listAttachments(submissionId);
      if (attachments.length > 0) {
        await this.deleteStorageFiles(attachments);
      }
    } catch (e) {
      // Si falla la detección/limpieza de archivos, no bloqueamos el borrado de la submission.
      console.warn('[deleteSubmissionCompletely] Problema eliminando archivos del storage:', e);
    }

    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', submissionId);
    if (error) throw error;
  },

  /**
   * ⚠️ Alias de compatibilidad con código existente.
   */
  async deleteById(submissionId: string): Promise<void> {
    // Ahora llamamos a la función RPC de la base de datos.
    // Esta función se encarga de verificar permisos y borrar todo en cascada.
    // Es más segura y eficiente.
    const { error } = await supabase.rpc('delete_user_submission', {
      submission_id_to_delete: submissionId,
    });

    if (error) {
      console.error('Error en RPC delete_user_submission:', error);
      throw new Error(`No se pudo eliminar el registro: ${error.message}`);
    }
  },
};
