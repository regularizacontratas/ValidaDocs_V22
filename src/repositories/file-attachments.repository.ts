import { supabase } from '../lib/supabase';
import { FileAttachment } from '../types/database.types';
import { storageRepository } from './storage.repository';

export const fileAttachmentsRepository = {
  async create(attachment: Partial<FileAttachment>): Promise<FileAttachment> {
    const { data, error } = await supabase
      .from('file_attachments')
      .insert(attachment)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Sube un archivo y crea el registro de metadatos en la base de datos.
   * Esta es la forma recomendada de manejar las subidas para asegurar la consistencia de datos.
   */
  async uploadAndCreateRecord(
    file: File,
    submissionId: string,
    fieldId: string,
    userId: string
  ): Promise<FileAttachment> {
    // 1. Subir el archivo usando el repositorio de storage.
    const { path } = await storageRepository.uploadFormAttachment(file, submissionId, fieldId);

    // 2. Crear el registro en la base de datos guardando la RUTA RELATIVA.
    return this.create({
      submission_id: submissionId,
      field_id: fieldId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: path, // ⬅️ ¡CORRECTO! Guardamos la ruta relativa, no la URL completa.
      uploaded_by: userId,
    });
  },

  async getBySubmission(submissionId: string): Promise<FileAttachment[]> {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('submission_id', submissionId);

    if (error) throw error;
    return data || [];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
