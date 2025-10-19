import { supabase } from '../lib/supabase';

export const storageRepository = {
  async uploadFile(
    companyId: string,
    submissionId: string,
    file: File
  ): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${companyId}/${submissionId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('form-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('form-attachments')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
    };
  },

  async uploadAttachment(
    companyId: string,
    submissionId: string,
    fieldId: string,
    file: File
  ): Promise<string> {
    const path = `${companyId}/${submissionId}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('form-attachments')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('file_attachments').insert({
      id: crypto.randomUUID(),
      submission_id: submissionId,
      field_id: fieldId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: path,
      uploaded_by: user?.id ?? null,
    });

    return path;
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('form-attachments')
      .remove([path]);

    if (error) throw error;
  },

  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('form-attachments')
      .getPublicUrl(path);

    return data.publicUrl;
  },

  async uploadCompanyLogo(
    companyId: string,
    file: File
  ): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}_logo_${Date.now()}.${fileExt}`;
    const filePath = `${companyId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    return { path: filePath, url: urlData.publicUrl };
  },

  async uploadUserAvatar(
    userId: string,
    file: File
  ): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_avatar_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    return { path: filePath, url: urlData.publicUrl };
  },
};
