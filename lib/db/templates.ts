/**
 * Template Data Access Layer
 * Story 3.4: Template CRUD API Endpoints - Epic 3 Schema
 *
 * BREAKING CHANGE from Story 1.3:
 * - Now uses Epic 3 denormalized schema (1 table with JSONB fields + user_id + RLS)
 * - Requires server-side Supabase client with auth context (NOT anonymous client)
 * - RLS policies automatically enforce user isolation (no manual WHERE user_id needed)
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
 * Create a new template (Epic 3)
 *
 * IMPORTANT: Requires authenticated Supabase client from lib/supabase-server.ts
 * RLS policies automatically set user_id from auth.uid()
 *
 * @param supabase - Authenticated server-side Supabase client
 * @param data - Template data (name, fields, extraction_prompt)
 * @returns Created template with all fields
 */
export async function createTemplate(
  supabase: SupabaseClient,
  data: CreateTemplateRequest
): Promise<Template> {
  try {
    // Insert template with Epic 3 schema
    // RLS INSERT policy automatically sets user_id = auth.uid()
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
      // Handle unique constraint violation (duplicate template name for user)
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
 * Get all templates for authenticated user (Epic 3)
 *
 * IMPORTANT: Requires authenticated Supabase client from lib/supabase-server.ts
 * RLS SELECT policy automatically filters by user_id = auth.uid()
 *
 * @param supabase - Authenticated server-side Supabase client
 * @returns Array of templates (RLS-filtered to current user only)
 */
export async function getTemplates(supabase: SupabaseClient): Promise<Template[]> {
  try {
    // RLS SELECT policy automatically filters to user's templates
    // No need for manual .eq('user_id', user.id)
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
 * Get a single template by ID (Epic 3)
 *
 * IMPORTANT: Requires authenticated Supabase client from lib/supabase-server.ts
 * RLS SELECT policy automatically filters by user_id = auth.uid()
 * Returns null if template not found OR user doesn't own it (security: don't reveal existence)
 *
 * @param supabase - Authenticated server-side Supabase client
 * @param id - Template UUID
 * @returns Template or null if not found/not owned by user
 */
export async function getTemplateById(
  supabase: SupabaseClient,
  id: string
): Promise<Template | null> {
  try {
    // RLS SELECT policy automatically filters to user's templates
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError) {
      // PGRST116 = no rows returned (either doesn't exist or RLS filtered it out)
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
 * Update a template (Epic 3)
 *
 * IMPORTANT: Requires authenticated Supabase client from lib/supabase-server.ts
 * RLS UPDATE policy automatically filters by user_id = auth.uid()
 * Returns null if template not found OR user doesn't own it
 *
 * @param supabase - Authenticated server-side Supabase client
 * @param id - Template UUID
 * @param data - Partial template data (only provided fields will be updated)
 * @returns Updated template or null if not found/not owned by user
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

    // RLS UPDATE policy automatically filters to user's templates
    // updated_at automatically updated by database trigger
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (templateError) {
      // PGRST116 = no rows updated (either doesn't exist or RLS blocked it)
      if (templateError.code === 'PGRST116') {
        return null;
      }
      // Handle unique constraint violation (duplicate template name for user)
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
 * Delete a template (Epic 3)
 *
 * IMPORTANT: Requires authenticated Supabase client from lib/supabase-server.ts
 * RLS DELETE policy automatically filters by user_id = auth.uid()
 * Returns false if template not found OR user doesn't own it
 *
 * @param supabase - Authenticated server-side Supabase client
 * @param id - Template UUID
 * @returns true if deleted, false if not found/not owned by user
 */
export async function deleteTemplate(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  try {
    // RLS DELETE policy automatically filters to user's templates
    const { error, count } = await supabase
      .from('templates')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    // Return true if a row was deleted, false if nothing was deleted (not found or RLS blocked)
    return (count ?? 0) > 0;
  } catch (error: any) {
    console.error('Error in deleteTemplate:', error);
    throw error;
  }
}
