/**
 * Template Type Definitions
 * Story 3.4: Template CRUD API Endpoints - Epic 3 Schema
 *
 * BREAKING CHANGE from Story 1.3:
 * - Epic 1: Normalized 3-table schema (templates, template_fields, template_prompts)
 * - Epic 3: Denormalized 1-table schema with JSONB fields and user_id + RLS
 *
 * Shared TypeScript interfaces matching Epic 3 database schema
 */

/**
 * Template Field Interface (Epic 3)
 * Stored as JSONB array in templates.fields column
 *
 * Changes from Epic 1:
 * - Removed: template_id (no longer separate table)
 * - Removed: field_type, is_header, created_at (not in Epic 3 spec)
 * - Renamed: field_name → name, display_order → order
 * - Added: instructions (optional custom field instructions)
 */
export interface TemplateField {
  id: string;
  name: string;
  instructions?: string;
  order: number;
}

/**
 * Template Interface (Epic 3)
 * Matches the `templates` database table after migration
 *
 * Changes from Epic 1:
 * - Added: user_id (FK to auth.users, required for multi-user support)
 * - Added: fields (JSONB array, replaces template_fields table)
 * - Added: extraction_prompt (TEXT, replaces template_prompts table)
 * - Removed: template_type (not in Epic 3 spec)
 */
export interface Template {
  id: string;
  user_id: string;
  name: string;
  fields: TemplateField[];
  extraction_prompt: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create Template Request (Epic 3)
 * Used for POST /api/templates
 *
 * Note: user_id auto-added by RLS from auth.uid()
 */
export interface CreateTemplateRequest {
  name: string;
  fields: TemplateField[];
  extraction_prompt?: string;
}

/**
 * Update Template Request (Epic 3)
 * Used for PUT /api/templates/:id
 *
 * All fields optional for partial updates
 */
export interface UpdateTemplateRequest {
  name?: string;
  fields?: TemplateField[];
  extraction_prompt?: string;
}

/**
 * Template List Response
 * Used for GET /api/templates
 */
export interface TemplateListResponse {
  templates: Template[];
}

/**
 * Template Detail Response
 * Used for GET /api/templates/:id
 */
export interface TemplateDetailResponse {
  template: Template;
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
  message: string;
}

/**
 * Error Response
 * Standard error format for API responses
 */
export interface ErrorResponse {
  error: string;
  details?: any;
}
