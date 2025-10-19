/**
 * Template Type Definitions
 * Story 1.3: Template Data Model and Storage
 *
 * Shared TypeScript interfaces matching database schema
 */

// Template Types Enum - matches database CHECK constraint
export enum TemplateType {
  INVOICE = 'invoice',
  ESTIMATE = 'estimate',
  EQUIPMENT_LOG = 'equipment_log',
  TIMESHEET = 'timesheet',
  CONSUMABLE_LOG = 'consumable_log',
  GENERIC = 'generic'
}

// Field Types Enum - application-level validation
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  CURRENCY = 'currency'
}

// Prompt Types - for different AI prompt use cases
export enum PromptType {
  EXTRACTION = 'extraction',
  VALIDATION = 'validation',
  REFINEMENT = 'refinement',
  CUSTOM = 'custom'
}

/**
 * Template Interface
 * Matches the `templates` database table
 */
export interface Template {
  id: string;
  name: string;
  template_type: TemplateType | string;
  created_at: string;
  updated_at: string;
}

/**
 * Template Field Interface
 * Matches the `template_fields` database table
 */
export interface TemplateField {
  id: string;
  template_id: string;
  field_name: string;
  field_type: FieldType | string;
  is_header: boolean;
  display_order: number;
  created_at: string;
}

/**
 * Template Prompt Interface
 * Matches the `template_prompts` database table
 */
export interface TemplatePrompt {
  id: string;
  template_id: string;
  prompt_text: string;
  prompt_type: PromptType | string;
  created_at: string;
}

/**
 * Template with Related Data
 * Used when fetching complete template with fields and prompts
 */
export interface TemplateWithRelations extends Template {
  fields?: TemplateField[];
  prompts?: TemplatePrompt[];
}

/**
 * Create Template Request
 * Used for POST /api/templates
 */
export interface CreateTemplateRequest {
  name: string;
  template_type: TemplateType | string;
  fields?: Omit<TemplateField, 'id' | 'template_id' | 'created_at'>[];
  prompts?: Omit<TemplatePrompt, 'id' | 'template_id' | 'created_at'>[];
}

/**
 * Update Template Request
 * Used for PUT /api/templates/:id
 */
export interface UpdateTemplateRequest {
  name?: string;
  template_type?: TemplateType | string;
  fields?: Omit<TemplateField, 'id' | 'template_id' | 'created_at'>[];
  prompts?: Omit<TemplatePrompt, 'id' | 'template_id' | 'created_at'>[];
}

/**
 * Template List Item
 * Extended Template with field count for list views
 */
export interface TemplateListItem extends Template {
  field_count?: number;
}

/**
 * Template List Response
 * Used for GET /api/templates
 */
export interface TemplateListResponse {
  templates: TemplateListItem[];
}

/**
 * Template Detail Response
 * Used for GET /api/templates/:id
 */
export interface TemplateDetailResponse {
  template: Template;
  fields: TemplateField[];
  prompts: TemplatePrompt[];
}

/**
 * Template Create Response
 * Used for POST /api/templates
 */
export interface TemplateCreateResponse {
  template: Template;
}

/**
 * Template Update Response
 * Used for PUT /api/templates/:id
 */
export interface TemplateUpdateResponse {
  template: Template;
}

/**
 * Template Delete Response
 * Used for DELETE /api/templates/:id
 */
export interface TemplateDeleteResponse {
  success: boolean;
  id: string;
}

/**
 * Error Response
 * Standard error format for API responses
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}
