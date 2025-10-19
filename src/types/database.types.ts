// ============================================================================
// DATABASE TYPES - Generado desde esquema REAL de Supabase
// Fecha: 2025-01-09
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type CompanyType = 'CLIENT' | 'PROVIDER' | 'MIXED';

export type FormTargetType = 'PERSONA' | 'EMPRESA';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'file' 
  | 'select' 
  | 'checkbox' 
  | 'radio';

export type FileSource = 'CAMERA' | 'EXPLORER' | 'BOTH';

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'AI_APPROVED' 
  | 'PENDING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED';

export type ValidationStatus = 'APPROVED' | 'WARNING' | 'REJECTED' | 'ERROR';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type AssignmentType = 'READ_ONLY' | 'COMPLETE_ONLY' | 'VIEW_AND_COMPLETE';

export type PersonStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export type VerificationAction = 'VERIFIED' | 'REVOKED' | 'UPDATED';

// ============================================================================
// TABLE INTERFACES
// ============================================================================

// ---------- USERS ----------
export interface User {
  id: string; // uuid - viene de auth.users
  name: string; // NOT NULL
  email: string; // NOT NULL
  role: UserRole; // DEFAULT 'USER'
  company_id?: string; // uuid
  avatar_url?: string;
  created_by?: string; // uuid
  created_at: string; // timestamptz - DEFAULT now()
  last_login_at?: string; // timestamptz
  updated_at?: string; // timestamptz - DEFAULT now()
}

// ---------- COMPANIES ----------
export interface Company {
  id: string; // uuid - DEFAULT generate_ulid()
  name: string; // NOT NULL
  company_type: CompanyType; // DEFAULT 'MIXED'
  rut?: string;
  address?: string;
  comuna?: string;
  region?: string;
  phone?: string;
  email?: string;
  business_activity?: string;
  logo_url?: string;
  created_by?: string; // uuid
  created_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- PEOPLE ----------
export interface Person {
  id: string; // uuid - DEFAULT generate_ulid()
  rut: string; // NOT NULL
  first_name: string; // NOT NULL
  last_name: string; // NOT NULL
  birth_date?: string; // date
  education?: string;
  created_by?: string; // uuid
  created_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- COMPANY_PEOPLE ----------
export interface CompanyPerson {
  id: string; // uuid - DEFAULT generate_ulid()
  company_id: string; // uuid - NOT NULL
  person_id: string; // uuid - NOT NULL
  role?: string;
  status: PersonStatus; // DEFAULT 'ACTIVE'
  hire_date?: string; // date
  end_date?: string; // date
  created_by?: string; // uuid
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORMS ----------
export interface Form {
  id: string; // uuid - DEFAULT generate_ulid()
  form_name: string; // NOT NULL
  description?: string;
  form_prompt?: string; // Prompt general de IA
  target_type: FormTargetType; // NOT NULL
  owner_company_id: string; // uuid - NOT NULL
  is_public_template: boolean; // DEFAULT false
  parent_form_id?: string; // uuid - auto-referencia
  template_category?: string;
  verified: boolean; // DEFAULT false
  verified_by?: string; // uuid
  verified_at?: string; // timestamptz
  verification_notes?: string;
  quality_score?: number; // integer
  verification_expires_at?: string; // timestamptz
  version: number; // DEFAULT 1
  created_by?: string; // uuid
  created_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORM_FIELDS ----------
export interface FormField {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  label: string; // NOT NULL
  type: FieldType; // NOT NULL
  field_order: number; // DEFAULT 0
  required: boolean; // DEFAULT false
  placeholder_text?: string;
  help_text?: string;
  format_rule?: string; // ej: 'RUN_CHILENO', 'CAPITALIZE'
  validation_regex?: string;
  file_config?: Record<string, any>; // jsonb
  options?: Record<string, any>; // jsonb
  ai_validation_prompt?: string;
  created_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORM_REQUESTS ----------
export interface FormRequest {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  requester_company_id: string; // uuid - NOT NULL
  target_company_id: string; // uuid - NOT NULL
  request_type: string; // DEFAULT 'ASSIGNMENT'
  status: RequestStatus; // DEFAULT 'PENDING'
  message?: string;
  due_date?: string; // date
  requested_by?: string; // uuid
  requested_at: string; // timestamptz - DEFAULT now()
  responded_by?: string; // uuid
  responded_at?: string; // timestamptz
}

// ---------- FORM_ASSIGNMENTS ----------
export interface FormAssignment {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  owner_company_id: string; // uuid - NOT NULL
  assigned_company_id: string; // uuid - NOT NULL
  assignment_type: AssignmentType; // DEFAULT 'COMPLETE_ONLY'
  can_share: boolean; // DEFAULT false
  expires_at?: string; // date
  is_active: boolean; // DEFAULT true
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORM_SUBMISSIONS ----------
export interface FormSubmission {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  target_id: string; // uuid - NOT NULL (persona o empresa)
  values_json: Record<string, any>; // jsonb - NOT NULL
  raw_values_json?: Record<string, any>; // jsonb
  files_json?: Record<string, any>; // jsonb
  status: SubmissionStatus; // DEFAULT 'DRAFT'
  submitted_by?: string; // uuid
  submitted_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- FILE_ATTACHMENTS ----------
export interface FileAttachment {
  id: string; // uuid - DEFAULT generate_ulid()
  submission_id: string; // uuid - NOT NULL
  field_id: string; // uuid - NOT NULL
  file_name: string; // NOT NULL
  file_size: number; // integer - NOT NULL
  mime_type: string; // NOT NULL
  storage_path: string; // NOT NULL
  uploaded_by?: string; // uuid
  uploaded_at: string; // timestamptz - DEFAULT now()
}

// ---------- DOCUMENT_VALIDATIONS ----------
export interface DocumentValidation {
  id: string; // uuid - DEFAULT generate_ulid()
  submission_id: string; // uuid - NOT NULL
  file_attachment_id?: string; // uuid
  document_type_expected?: string;
  document_type_detected?: string;
  document_type_score?: number; // double precision
  field_validations?: Record<string, any>; // jsonb
  special_validations?: Record<string, any>; // jsonb
  total_score?: number; // double precision
  validation_status: ValidationStatus; // NOT NULL
  validation_error?: string;
  validated_at: string; // timestamptz - DEFAULT now()
  validated_by?: string; // uuid
}

// ---------- VALIDATION_RULES ----------
export interface ValidationRule {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  document_type: string; // NOT NULL
  field_mapping: Record<string, any>; // jsonb - NOT NULL
  min_required_score: number; // double precision - DEFAULT 90.0
  enabled: boolean; // DEFAULT true
  created_at: string; // timestamptz - DEFAULT now()
  updated_at: string; // timestamptz - DEFAULT now()
}

// ---------- AI_VALIDATION_LOGS ----------
export interface AIValidationLog {
  id: string; // uuid - DEFAULT generate_ulid()
  validation_id?: string; // uuid
  request_payload: Record<string, any>; // jsonb - NOT NULL
  response_payload?: Record<string, any>; // jsonb
  api_used: string; // DEFAULT 'openai-gpt4o'
  tokens_used?: number; // integer
  duration_ms?: number; // integer
  error_details?: string;
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- PERSON_FORM_COMPLETIONS ----------
export interface PersonFormCompletion {
  id: string; // uuid - DEFAULT generate_ulid()
  person_id: string; // uuid - NOT NULL
  company_id: string; // uuid - NOT NULL
  form_id: string; // uuid - NOT NULL
  submission_id?: string; // uuid
  status: string; // DEFAULT 'PENDING'
  completed_at?: string; // timestamptz
  expires_at?: string; // timestamptz
  last_validated_at?: string; // timestamptz
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORM_VERIFICATION_HISTORY ----------
export interface FormVerificationHistory {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  verified_by?: string; // uuid
  action: VerificationAction; // NOT NULL
  quality_score?: number; // integer
  notes?: string;
  issues_found?: Record<string, any>; // jsonb
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- FORM_ACCESS_LOGS ----------
export interface FormAccessLog {
  id: string; // uuid - DEFAULT generate_ulid()
  form_id: string; // uuid - NOT NULL
  user_id?: string; // uuid
  company_id?: string; // uuid
  action: string; // NOT NULL
  success: boolean; // NOT NULL
  failure_reason?: string;
  ip_address?: string; // inet
  user_agent?: string;
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- NOTIFICATIONS ----------
export interface Notification {
  id: string; // uuid - DEFAULT generate_ulid()
  user_id?: string; // uuid
  company_id?: string; // uuid
  type: string; // NOT NULL
  title: string; // NOT NULL
  message: string; // NOT NULL
  link?: string;
  read_at?: string; // timestamptz
  created_at: string; // timestamptz - DEFAULT now()
}

// ---------- AUDIT_TRAIL ----------
export interface AuditTrail {
  id: string; // uuid - DEFAULT generate_ulid()
  entity_type: string; // NOT NULL
  entity_id: string; // uuid - NOT NULL
  action: string; // NOT NULL
  performed_by?: string; // uuid
  company_context?: string; // uuid
  metadata?: Record<string, any>; // jsonb
  created_at: string; // timestamptz - DEFAULT now()
}

// ============================================================================
// AUTH HELPER
// ============================================================================

export interface AuthUser {
  user: User | null;
  loading: boolean;
}