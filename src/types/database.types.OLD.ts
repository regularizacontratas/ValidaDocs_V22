export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type CompanyType = 'CLIENT' | 'SUPPLIER' | 'PARTNER' | 'INTERNAL';
export type FormTargetType = 'COMPANY' | 'PERSON' | 'VEHICLE' | 'EQUIPMENT';
export type FieldType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'textarea' | 'file' | 'select' | 'checkbox' | 'radio';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type AssignmentType = 'DIRECT' | 'REQUESTED' | 'INHERITED';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED' | 'APPROVED';
export type ValidationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  company_id?: string;
  created_by?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface Company {
  id: string;
  name: string;
  company_type: CompanyType;
  rut?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Form {
  id: string;
  form_name: string;
  description?: string;
  target_type: FormTargetType;
  owner_company_id: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

export interface FormField {
  id: string;
  form_id: string;
  label: string;
  type: FieldType;
  field_order: number;
  required: boolean;
  options?: any;
  ai_validation_prompt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormRequest {
  id: string;
  form_id: string;
  requester_company_id: string;
  target_company_id: string;
  request_type?: string;
  status: RequestStatus;
  requested_at?: string;
}

export interface FormAssignment {
  id: string;
  form_id: string;
  owner_company_id: string;
  assigned_company_id: string;
  assignment_type: AssignmentType;
  can_share: boolean;
  is_active: boolean;
  expires_at?: string;
  created_at?: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  target_id: string;
  values_json: Record<string, any>;
  raw_values_json?: Record<string, any>;
  files_json?: Record<string, any>;
  status: SubmissionStatus;
  submitted_by: string;
  submitted_at?: string;
  updated_at?: string;
}

export interface FileAttachment {
  id: string;
  submission_id: string;
  field_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at?: string;
}

export interface DocumentValidation {
  id: string;
  submission_id: string;
  file_attachment_id?: string;
  field_validations?: any;
  total_score?: number;
  validation_status: ValidationStatus;
  validated_at?: string;
  validated_by?: string;
}

export interface PersonFormCompletion {
  id: string;
  person_id: string;
  company_id: string;
  form_id: string;
  submission_id: string;
  status: string;
  completed_at?: string;
  expires_at?: string;
  last_validated_at?: string;
  created_at?: string;
}

export interface AuthUser {
  user: User | null;
  loading: boolean;
}
