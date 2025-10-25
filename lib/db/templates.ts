/**
 * Template Data Access Layer
 * Reverted from Story 3.4 authentication to single-user mode
 *
 * CHANGE from Story 3.4:
 * - Now uses Epic 3 denormalized schema (1 table with JSONB fields) WITHOUT user_id or RLS
 * - Uses anonymous Supabase client from lib/supabase.ts (no authentication)
 * - No RLS policies (single-user mode)
 *
 * Database utility functions for template CRUD operations
 * Provides separation of concerns between API routes and database logic
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest
} from '@/types/template';

/**
 * Create a new template
 *
 * No authentication required (single-user mode)
 *
 * @param supabase - Supabase client
 * @param data - Template data (name, fields, extraction_prompt)
 * @returns Created template with all fields
 */
export async function createTemplate(
  supabase: SupabaseClient,
  data: CreateTemplateRequest
): Promise<Template> {
  try {
    // Insert template (no auth required)
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: data.name,
        fields: data.fields,  // JSONB array
        extraction_prompt: data.extraction_prompt || null
      })
      .select()
      .single();

    if (templateError) {
      // Handle unique constraint violation (duplicate template name)
      if (templateError.code === '23505') {
        throw new Error('A template with this name already exists');
      }
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    if (!template) {
      throw new Error('Template created but no data returned');
    }

    return template;
  } catch (error: any) {
    console.error('Error in createTemplate:', error);
    throw error;
  }
}

/**
 * Get all templates
 *
 * No authentication required (single-user mode)
 *
 * @param supabase - Supabase client
 * @returns Array of all templates
 */
export async function getTemplates(supabase: SupabaseClient): Promise<Template[]> {
  try {
    // Fetch all templates (no auth filtering)
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    return templates || [];
  } catch (error: any) {
    console.error('Error in getTemplates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID
 *
 * No authentication required (single-user mode)
 *
 * @param supabase - Supabase client
 * @param id - Template UUID
 * @returns Template or null if not found
 */
export async function getTemplateById(
  supabase: SupabaseClient,
  id: string
): Promise<Template | null> {
  try {
    // Fetch template by ID (no auth filtering)
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError) {
      // PGRST116 = no rows returned
      if (templateError.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    return template;
  } catch (error: any) {
    console.error('Error in getTemplateById:', error);
    throw error;
  }
}

/**
 * Update a template
 *
 * No authentication required (single-user mode)
 *
 * @param supabase - Supabase client
 * @param id - Template UUID
 * @param data - Partial template data (only provided fields will be updated)
 * @returns Updated template or null if not found
 */
export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  data: UpdateTemplateRequest
): Promise<Template | null> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<Template> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.fields !== undefined) updateData.fields = data.fields;
    if (data.extraction_prompt !== undefined) updateData.extraction_prompt = data.extraction_prompt;

    // Update template (no auth filtering)
    // updated_at automatically updated by database trigger
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (templateError) {
      // PGRST116 = no rows updated
      if (templateError.code === 'PGRST116') {
        return null;
      }
      // Handle unique constraint violation (duplicate template name)
      if (templateError.code === '23505') {
        throw new Error('A template with this name already exists');
      }
      throw new Error(`Failed to update template: ${templateError.message}`);
    }

    return template;
  } catch (error: any) {
    console.error('Error in updateTemplate:', error);
    throw error;
  }
}

/**
 * Delete a template
 *
 * No authentication required (single-user mode)
 *
 * @param supabase - Supabase client
 * @param id - Template UUID
 * @returns true if deleted, false if not found
 */
export async function deleteTemplate(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  try {
    // Delete template (no auth filtering)
    const { error, count } = await supabase
      .from('templates')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    // Return true if a row was deleted, false if nothing was deleted
    return (count ?? 0) > 0;
  } catch (error: any) {
    console.error('Error in deleteTemplate:', error);
    throw error;
  }
}
