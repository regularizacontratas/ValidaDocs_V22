import { supabase } from '../lib/supabase';
import { Form, FormField } from '../types/database.types';

type FormDB = Form & { form_prompt?: string };
type FormApp = Form & { ai_prompt?: string };

function dbFormToApp(dbForm: FormDB): FormApp {
  const { form_prompt, ...rest } = dbForm as any;
  return {
    ...rest,
    ai_prompt: form_prompt,
  };
}

function appFormToDb(appForm: FormApp): FormDB {
  const { ai_prompt, ...rest } = appForm as any;
  return {
    ...rest,
    form_prompt: ai_prompt,
  };
}

/** 🔧 Normaliza posibles formas de URL que pueda devolver Storage o tu JSON */
function normalizeFileUrl(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw || null;
  return (
    raw.url ??
    raw.publicUrl ??
    raw.publicURL ??
    raw.signedUrl ??
    raw.data?.publicUrl ??
    raw.data?.publicURL ??
    raw.data?.signedUrl ??
    null
  );
}

export const formsRepository = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('forms')
      .select(
        `
        *,
        company:companies!forms_owner_company_id_fkey (
          id,
          name,
          rut
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByCompany(companyId: string): Promise<Form[]> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('owner_company_id', companyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async listFormsByOwnerCompany(companyId: string) {
    return supabase
      .from('forms')
      .select('*')
      .eq('owner_company_id', companyId)
      .order('updated_at', { ascending: false });
  },

  async getById(id: string): Promise<Form | null> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getFormWithFields(
    formId: string
  ): Promise<{ form: Form; fields: FormField[] }> {
    const form = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (form.error) throw form.error;

    const fields = await supabase
      .from('form_fields')
      .select(
        'id, form_id, label, type, field_order, required, options, ai_validation_prompt, created_at, updated_at, placeholder_text'
      )
      .eq('form_id', formId)
      .order('field_order', { ascending: true });

    if (fields.error) throw fields.error;

    return { form: form.data, fields: fields.data ?? [] };
  },

  async create(form: Partial<Form>): Promise<Form> {
    const { data, error } = await supabase
      .from('forms')
      .insert(form)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Form>): Promise<Form> {
    const { data, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('forms').delete().eq('id', id);
    if (error) throw error;
  },

  // ⭐ Formularios asignados
  async getAssignedForms(companyId: string) {
    const { data, error } = await supabase
      .from('form_assignments')
      .select(
        `
        id,
        assignment_type,
        can_share,
        expires_at,
        form_id,
        forms!form_id (
          id,
          form_name,
          description,
          target_type,
          created_at,
          owner_company_id
        )
      `
      )
      .eq('assigned_company_id', companyId)
      .eq('is_active', true);

    if (error) {
      console.error('Error en getAssignedForms:', error);
      throw error;
    }

    const ownerCompanyIds = [
      ...new Set(data?.map((d) => d.forms?.owner_company_id).filter(Boolean)),
    ];

    let companiesMap = new Map();

    if (ownerCompanyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', ownerCompanyIds);

      companiesMap = new Map(companies?.map((c) => [c.id, c.name]) || []);
    }

    return (
      data?.map((assignment) => ({
        assignmentId: assignment.id,
        assignmentType: assignment.assignment_type,
        canShare: assignment.can_share,
        expiresAt: assignment.expires_at,
        form: assignment.forms,
        ownerCompany: {
          id: assignment.forms?.owner_company_id || '',
          name:
            companiesMap.get(assignment.forms?.owner_company_id) ||
            'Desconocido',
        },
      })) || []
    );
  },

  // ========================================
  // FASE 6: PERSISTENCIA DE SUBMISSIONS (JSON)
  // ========================================

  /** Crea una submission completa con valores y archivos en JSON */
  async createSubmission(params: {
    form_id: string;
    user_id: string;
    company_id: string;
    status:
      | 'DRAFT'
      | 'SUBMITTED'
      | 'APPROVED'
      | 'REJECTED'
      | 'PENDING_AI_VALIDATION';
    values: { [fieldId: string]: string | boolean };
    files: {
      [fieldId: string]: {
        name: string;
        url: string;
        size: number;
        type: string;
      };
    };
  }) {
    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        form_id: params.form_id,
        target_id: params.company_id,
        submitted_by: params.user_id,
        status: params.status,
        values_json: params.values,
        files_json: params.files,
        // submitted_at se debe gestionar en DB con DEFAULT o trigger
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  /** ✅ Obtiene las submissions de un usuario (con firstFields) */
  async getUserSubmissions(userId: string) {
    const { data, error } = await supabase
      .from('form_submissions')
      .select(
        `
        id,
        form_id,
        status,
        submitted_at,
        updated_at,
        values_json,
        files_json,
        forms (
          id,
          form_name,
          description
        )
      `
      )
      .eq('submitted_by', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    // Optimización: Obtener todos los campos y conteos de archivos en menos consultas
    const formIds = [...new Set(data.map((s) => s.form_id))];
    const submissionIds = data.map((s) => s.id);

    const { data: allFields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('id, form_id, label, type, field_order')
      .in('form_id', formIds)
      .order('field_order', { ascending: true });

    if (fieldsError) throw fieldsError;

    const { data: fileCountsData, error: countError } = await supabase
      .from('file_attachments')
      .select('submission_id, count:id')
      .in('submission_id', submissionIds);

    if (countError) throw countError;

    const fieldsByForm = (allFields || []).reduce((acc, field) => {
      if (!acc[field.form_id]) acc[field.form_id] = [];
      acc[field.form_id].push(field);
      return acc;
    }, {} as Record<string, any[]>);

    const filesCountMap = (fileCountsData || []).reduce((acc: Record<string, number>, item: any) => {
      if (!acc[item.submission_id]) {
        acc[item.submission_id] = 0;
      }
      acc[item.submission_id]++;
      return acc;
    }, {});

    return data.map((submission) => {
      const formFields = fieldsByForm[submission.form_id] || [];
      const values = submission.values_json || {};
      const firstFields = formFields
        .filter((field) => field.type !== 'file')
        .slice(0, 5)
        .map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          value: values[field.id] ?? null,
        }));

      return {
        id: submission.id,
        formId: submission.form_id,
        formName: submission.forms?.form_name || 'Sin nombre',
        status: submission.status,
        submittedAt: submission.submitted_at,
        updatedAt: submission.updated_at,
        filesCount: filesCountMap[submission.id] || 0,
        firstFields,
      };
    });
  },

  /** ✅ Detalle de una submission (ahora archivos traen fieldId y url normalizada) */
  async getSubmissionDetail(submissionId: string) {
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select(
        `
        id,
        form_id,
        status,
        submitted_at,
        updated_at,
        values_json,
        files_json,
        forms (
          id,
          form_name,
          description
        )
      `
      )
      .eq('id', submissionId)
      .single();

    if (error) throw error;

    const { data: fields } = await supabase
      .from('form_fields')
      .select('id, label, type, field_order')
      .eq('form_id', submission.form_id)
      .order('field_order', { ascending: true });

    const valuesWithLabels = (fields || []).map((field) => ({
      label: field.label,
      type: field.type,
      value: submission.values_json?.[field.id] ?? null,
      fieldId: field.id,
    }));

    const filesWithLabels = (fields || [])
      .filter((field) => field.type === 'file')
      .map((field) => {
        const fileData = submission.files_json?.[field.id];
        if (!fileData) return null;

        const url = normalizeFileUrl(fileData);
        return {
          fieldId: field.id,
          label: field.label,
          url,
          name: fileData.name ?? null,
          size: fileData.size ?? null,
          type: fileData.type ?? fileData.mime_type ?? null,
        };
      })
      .filter(Boolean) as Array<{
        fieldId: string;
        label: string;
        url: string | null;
        name: string | null;
        size: number | null;
        type: string | null;
      }>;

    return {
      id: submission.id,
      formId: submission.form_id,
      formName: submission.forms?.form_name || 'Sin nombre',
      formDescription: submission.forms?.description,
      status: submission.status,
      submittedAt: submission.submitted_at,
      updatedAt: submission.updated_at,
      fields: valuesWithLabels,
      files: filesWithLabels,
    };
  },

  /** Enviar submission a validación IA (con N8N real) */
  async submitForAIValidation(submissionId: string) {
    const { error: updateError } = await supabase
      .from('form_submissions')
      .update({ status: 'PENDING_AI_VALIDATION' })
      .eq('id', submissionId);
    if (updateError) throw updateError;

    const { data: validation, error: validationError } = await supabase
      .from('ai_validations')
      .insert({
        submission_id: submissionId,
        status: 'PENDING',
        n8n_execution_id: `pending_${Date.now()}`,
      })
      .select()
      .single();
    if (validationError) throw validationError;

    await supabase
      .from('form_submissions')
      .update({ ai_validation_id: validation.id })
      .eq('id', submissionId);

    try {
      await this.callN8NWebhook(submissionId);
    } catch (error) {
      console.error('Error llamando a n8n:', error);
    }

    return validation;
  },

  async simulateAIValidationResponse(
    submissionId: string,
    validationId: string
  ) {
    const { data: submission } = await supabase
      .from('form_submissions')
      .select('values_json, form_id')
      .eq('id', submissionId)
      .single();

    if (!submission) return;

    const { data: fields } = await supabase
      .from('form_fields')
      .select('id, label, type')
      .eq('form_id', submission.form_id);

    const aiResults: any = {};
    let totalScore = 0;
    const issuesFound: string[] = [];

    fields?.forEach((field) => {
      if (field.type === 'file') return;

      const value = submission.values_json[field.id];
      const randomScore = 0.85 + Math.random() * 0.15;
      const match = randomScore > 0.9;

      aiResults[field.id] = {
        label: field.label,
        extracted: value,
        expected: value,
        match,
        confidence: randomScore,
      };

      if (!match) issuesFound.push(`${field.label}: Revisar manualmente`);

      totalScore += randomScore;
    });

    const avgScore =
      fields && fields.length > 0 ? totalScore / fields.length : 0;
    const recommendation =
      avgScore > 0.95 ? 'APPROVE' : avgScore > 0.85 ? 'REVIEW' : 'REJECT';

    await supabase
      .from('ai_validations')
      .update({
        status: 'COMPLETED',
        ai_results: aiResults,
        overall_score: avgScore.toFixed(2),
        recommendation,
        issues_found: issuesFound,
        processed_at: new Date().toISOString(),
      })
      .eq('id', validationId);

    await supabase
      .from('form_submissions')
      .update({ status: 'AI_VALIDATED' })
      .eq('id', submissionId);
  },

  async getAIValidation(submissionId: string) {
    const { data, error } = await supabase
      .from('ai_validations')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async submitForHumanReview(submissionId: string) {
    const { error } = await supabase
      .from('form_submissions')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) throw error;
  },

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments: string
  ) {
    const { error: reviewError } = await supabase
      .from('audit_reviews')
      .insert({
        submission_id: submissionId,
        reviewer_id: reviewerId,
        decision,
        comments,
      });

    if (reviewError) throw reviewError;

    const { error: updateError } = await supabase
      .from('form_submissions')
      .update({ status: decision })
      .eq('id', submissionId);

    if (updateError) throw updateError;
  },

  /** Actualiza una submission existente (borradores/ediciones) */
  async updateSubmission(
    submissionId: string,
    params: {
      values: { [fieldId: string]: string | boolean };
      files: {
        [fieldId: string]: {
          name: string;
          url: string;
          size: number;
          type: string;
        };
      };
      status?: 'DRAFT' | 'SUBMITTED' | 'PENDING_AI_VALIDATION';
    }
  ) {
    const { data, error } = await supabase
      .from('form_submissions')
      .update({
        values_json: params.values,
        files_json: params.files,
        status: params.status || 'DRAFT',
        // updated_at y submitted_at deben ser gestionados por la DB
      })
      .eq('id', submissionId)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  async retryAIValidation(submissionId: string) {
    try {
      const { data: validation } = await supabase
        .from('ai_validations')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

      if (validation) {
        await supabase
          .from('ai_validations')
          .update({
            retry_count: (validation.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
            status: 'PENDING',
            error_message: null,
            error_type: null,
          })
          .eq('id', validation.id);
      }

      await supabase
        .from('form_submissions')
        .update({ status: 'PENDING_AI_VALIDATION' })
        .eq('id', submissionId);

      await this.callN8NWebhook(submissionId);
      return { success: true };
    } catch (error) {
      console.error('Error en retry:', error);
      throw error;
    }
  },

  async markValidationAsFailed(
    submissionId: string,
    errorType: string,
    errorMessage: string
  ) {
    try {
      const { data: existingValidation } = await supabase
        .from('ai_validations')
        .select('id')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (existingValidation) {
        await supabase
          .from('ai_validations')
          .update({
            status: 'FAILED',
            error_type: errorType,
            error_message: errorMessage,
            processed_at: new Date().toISOString(),
          })
          .eq('id', existingValidation.id);
      } else {
        await supabase.from('ai_validations').insert({
          submission_id: submissionId,
          status: 'FAILED',
          error_type: errorType,
          error_message: errorMessage,
          processed_at: new Date().toISOString(),
        });
      }

      await supabase
        .from('form_submissions')
        .update({ status: 'AI_VALIDATION_FAILED' })
        .eq('id', submissionId);

      return { success: true };
    } catch (error) {
      console.error('Error marcando como fallido:', error);
      throw error;
    }
  },

  async submitWithoutAI(submissionId: string) {
    const { error } = await supabase
      .from('form_submissions')
      .update({ status: 'SUBMITTED' })
      .eq('id', submissionId);

    if (error) throw error;
  },

  /** ✅ Llamada a Webhook de N8N (usa field_id, no label) */
  async callN8NWebhook(submissionId: string) {
    const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
    const WEBHOOK_TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN;
    const TIMEOUT_MS = 300000; // 5 minutos

    try {
      // 1) Submission con files => { fieldId, label, url, type... }
      const submissionData = await this.getSubmissionDetail(submissionId);

      // 2) Metadatos de campos
      const { data: fieldsData } = await supabase
        .from('form_fields')
        .select('id, label, type, ai_validation_prompt')
        .eq('form_id', submissionData.formId);

      const fieldById = new Map<string, any>(
        (fieldsData || []).map((f) => [f.id, f])
      );

      // 3) Campos (no archivos)
      const payloadFields = submissionData.fields
        .filter((f: any) => f.type !== 'file')
        .map((f: any) => ({
          field_id: f.fieldId,
          label: f.label,
          type: f.type,
          value: f.value,
          ai_prompt:
            fieldById.get(f.fieldId)?.ai_validation_prompt ||
            `Valida que el campo ${f.label} sea correcto`,
        }));

      // 4) Archivos por field_id (no por label)
      const payloadFiles = (submissionData.files || []).map((f: any) => {
        const meta = fieldById.get(f.fieldId);
        const mime = f.type || null;
        return {
          field_id: f.fieldId,
          label: f.label,
          url: f.url, // ya normalizada
          mime_type: mime,
          type: mime && String(mime).startsWith('image/') ? 'image' : 'document',
          ai_prompt:
            meta?.ai_validation_prompt || `Analiza el documento ${f.label}`,
        };
      });

      // Aviso si falta alguna URL (no filtramos en silencio)
      const missingUrls = payloadFiles.filter((x) => !x.url);
      if (missingUrls.length) {
        console.warn('Archivos sin URL en payload:', missingUrls);
      }

      const payload = {
        submission_id: submissionId,
        form_id: submissionData.formId,
        form_name: submissionData.formName,
        callback_url:
          'https://hstogenpgvxalhgrxojx.supabase.co/functions/v1/ai-validation-callback',
        fields: payloadFields,
        files: payloadFiles,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Validation-Token': WEBHOOK_TOKEN,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`N8N respondió con error: ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error llamando a N8N:', error);

      let errorType = 'NETWORK_ERROR';
      let errorMessage = 'Error de red al conectar con N8N';

      if (error.name === 'AbortError') {
        errorType = 'TIMEOUT';
        errorMessage = 'El análisis tomó demasiado tiempo (más de 5 minutos)';
      } else if (error.message?.includes('N8N respondió')) {
        errorType = 'N8N_ERROR';
        errorMessage = error.message;
      }

      await this.markValidationAsFailed(submissionId, errorType, errorMessage);
      throw error;
    }
  },
};
