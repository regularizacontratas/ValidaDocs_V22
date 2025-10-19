// ✅ src/repositories/submissions.repository.ts
import { supabase } from '../lib/supabase';
import { FormSubmission } from '../types/database.types';

/** Buckets conocidos en tu proyecto. Ajusta si usas otros. */
const KNOWN_BUCKETS = ['public', 'documents', 'attachments', 'files', 'avatars'];

/** Bucket por defecto si no se puede inferir del storage_path */
const DEFAULT_BUCKET =
  (import.meta as any)?.env?.VITE_SUPABASE_DEFAULT_BUCKET || 'public';

type AttachmentRow = Record<string, any>;

function extractBucketAndPath(row: AttachmentRow): { bucket: string; path: string } | null {
  // 1) Caso más estructurado: columnas separadas
  const bucket =
    row.bucket || row.storage_bucket || row.bucket_name || null;

  const directPath =
    row.path || row.storage_key || row.file_path || null;

  const storagePath: string | null = row.storage_path || row.url || null;

  if (bucket && directPath) {
    return { bucket: String(bucket), path: String(directPath).replace(/^\/+/, '') };
  }

  // 2) Solo storage_path -> inferimos bucket/clave
  if (storagePath) {
    // Normalizamos sin protocolo
    const clean = String(storagePath).replace(/^https?:\/\/[^/]+\//, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    let inferredBucket = DEFAULT_BUCKET;
    let inferredPath = clean;

    // Si el primer segmento coincide con un bucket conocido, lo usamos como bucket
    const first = parts[0];
    if (KNOWN_BUCKETS.includes(first)) {
      inferredBucket = first;
      inferredPath = parts.slice(1).join('/');
    } else if (bucket) {
      // Si había bucket en otra columna, úsalo
      inferredBucket = bucket;
      inferredPath = clean;
    } else {
      // Último recurso: DEFAULT_BUCKET
      inferredPath = clean;
    }

    if (!inferredPath) return null;
    return { bucket: inferredBucket, path: inferredPath.replace(/^\/+/, '') };
  }

  // 3) No encontramos cómo mapear
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
    return this.deleteSubmissionCompletely(submissionId);
  },
};
