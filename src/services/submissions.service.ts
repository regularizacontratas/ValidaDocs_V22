import { formSubmissionsRepository } from '../repositories/form-submissions.repository';
import { storageRepository } from '../repositories/storage.repository';
import { FormSubmission } from '../types/database.types';

export const submissionsService = {
  async createDraftSubmission(
    formId: string,
    targetId: string,
    userId: string
  ): Promise<FormSubmission> {
    return await formSubmissionsRepository.createDraft(formId, targetId, userId);
  },

  async updateSubmissionValues(
    submissionId: string,
    values: Record<string, any>
  ): Promise<FormSubmission> {
    return await formSubmissionsRepository.saveValues(submissionId, values);
  },

  async uploadFieldFile(
    submissionId: string,
    fieldId: string,
    file: File,
    companyId: string,
    userId: string
  ): Promise<void> {
    await storageRepository.uploadAttachment(companyId, submissionId, fieldId, file);
  },

  async submitSubmission(submissionId: string): Promise<FormSubmission> {
    return await formSubmissionsRepository.submitSubmission(submissionId);
  },

  async getSubmission(submissionId: string): Promise<FormSubmission | null> {
    return await formSubmissionsRepository.getById(submissionId);
  },
};
