import { supabase } from '../lib/supabase';
import { FileAttachment } from '../types/database.types';

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
