/**
 * Template Data Access Layer
 * Story 1.3: Template Data Model and Storage
 *
 * Database utility functions for template CRUD operations
 * Provides separation of concerns between API routes and database logic
 */

import { supabase } from '@/lib/supabase';
import {
  Template,
  TemplateListItem,
  TemplateField,
  TemplatePrompt,
  TemplateWithRelations,
  CreateTemplateRequest,
  UpdateTemplateRequest
} from '@/types/template';

/**
 * Create a new template with optional fields and prompts
 * Uses transaction-like behavior with rollback on failure
 */
export async function createTemplate(
  data: CreateTemplateRequest
): Promise<Template> {
  try {
    // 1. Create the template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: data.name,
        template_type: data.template_type
      })
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    if (!template) {
      throw new Error('Template created but no data returned');
    }

    // 2. Create fields if provided
    if (data.fields && data.fields.length > 0) {
      const fieldsToInsert = data.fields.map((field) => ({
        template_id: template.id,
        field_name: field.field_name,
        field_type: field.field_type,
        is_header: field.is_header,
        display_order: field.display_order
      }));

      const { error: fieldsError } = await supabase
        .from('template_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Rollback: delete the template if fields failed
        await supabase.from('templates').delete().eq('id', template.id);
        throw new Error(`Failed to create template fields: ${fieldsError.message}`);
      }
    }

    // 3. Create prompts if provided
    if (data.prompts && data.prompts.length > 0) {
      const promptsToInsert = data.prompts.map((prompt) => ({
        template_id: template.id,
        prompt_text: prompt.prompt_text,
        prompt_type: prompt.prompt_type
      }));

      const { error: promptsError } = await supabase
        .from('template_prompts')
        .insert(promptsToInsert);

      if (promptsError) {
        // Rollback: delete the template if prompts failed
        await supabase.from('templates').delete().eq('id', template.id);
        throw new Error(`Failed to create template prompts: ${promptsError.message}`);
      }
    }

    return template;
  } catch (error: any) {
    console.error('Error in createTemplate:', error);
    throw error;
  }
}

/**
 * Get all templates with field counts
 */
export async function getTemplates(): Promise<TemplateListItem[]> {
  try {
    // Use RPC function to get templates with field counts
    // Note: Supabase doesn't support COUNT(*) in select directly, so we use a workaround
    // We'll fetch templates and then get field counts separately
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    if (!templates || templates.length === 0) {
      return [];
    }

    // Get field counts for all templates
    const { data: fieldCounts, error: countsError } = await supabase
      .from('template_fields')
      .select('template_id')
      .in('template_id', templates.map(t => t.id));

    if (countsError) {
      console.error('Failed to fetch field counts:', countsError.message);
      // Return templates without field counts if query fails
      return templates.map(t => ({ ...t, field_count: 0 }));
    }

    // Count fields per template
    const fieldCountMap = new Map<string, number>();
    if (fieldCounts) {
      fieldCounts.forEach(fc => {
        fieldCountMap.set(fc.template_id, (fieldCountMap.get(fc.template_id) || 0) + 1);
      });
    }

    // Merge field counts with templates
    return templates.map(template => ({
      ...template,
      field_count: fieldCountMap.get(template.id) || 0
    }));
  } catch (error: any) {
    console.error('Error in getTemplates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID with all related fields and prompts
 */
export async function getTemplateById(
  id: string
): Promise<TemplateWithRelations | null> {
  try {
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    if (!template) {
      return null;
    }

    // Fetch fields
    const { data: fields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', id)
      .order('display_order', { ascending: true });

    if (fieldsError) {
      throw new Error(`Failed to fetch template fields: ${fieldsError.message}`);
    }

    // Fetch prompts
    const { data: prompts, error: promptsError } = await supabase
      .from('template_prompts')
      .select('*')
      .eq('template_id', id)
      .order('created_at', { ascending: true });

    if (promptsError) {
      throw new Error(`Failed to fetch template prompts: ${promptsError.message}`);
    }

    return {
      ...template,
      fields: fields || [],
      prompts: prompts || []
    };
  } catch (error: any) {
    console.error('Error in getTemplateById:', error);
    throw error;
  }
}

/**
 * Update a template and optionally replace fields/prompts
 */
export async function updateTemplate(
  id: string,
  data: UpdateTemplateRequest
): Promise<Template> {
  try {
    // 1. Update template basic fields
    const updateData: Partial<Template> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.template_type !== undefined) updateData.template_type = data.template_type;

    const { data: template, error: templateError } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to update template: ${templateError.message}`);
    }

    if (!template) {
      throw new Error('Template not found');
    }

    // 2. Replace fields if provided
    if (data.fields !== undefined) {
      // Delete existing fields
      const { error: deleteFieldsError } = await supabase
        .from('template_fields')
        .delete()
        .eq('template_id', id);

      if (deleteFieldsError) {
        throw new Error(`Failed to delete old fields: ${deleteFieldsError.message}`);
      }

      // Insert new fields
      if (data.fields.length > 0) {
        const fieldsToInsert = data.fields.map((field) => ({
          template_id: id,
          field_name: field.field_name,
          field_type: field.field_type,
          is_header: field.is_header,
          display_order: field.display_order
        }));

        const { error: fieldsError } = await supabase
          .from('template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) {
          throw new Error(`Failed to create new fields: ${fieldsError.message}`);
        }
      }
    }

    // 3. Replace prompts if provided
    if (data.prompts !== undefined) {
      // Delete existing prompts
      const { error: deletePromptsError } = await supabase
        .from('template_prompts')
        .delete()
        .eq('template_id', id);

      if (deletePromptsError) {
        throw new Error(`Failed to delete old prompts: ${deletePromptsError.message}`);
      }

      // Insert new prompts
      if (data.prompts.length > 0) {
        const promptsToInsert = data.prompts.map((prompt) => ({
          template_id: id,
          prompt_text: prompt.prompt_text,
          prompt_type: prompt.prompt_type
        }));

        const { error: promptsError } = await supabase
          .from('template_prompts')
          .insert(promptsToInsert);

        if (promptsError) {
          throw new Error(`Failed to create new prompts: ${promptsError.message}`);
        }
      }
    }

    return template;
  } catch (error: any) {
    console.error('Error in updateTemplate:', error);
    throw error;
  }
}

/**
 * Delete a template (cascade deletes fields and prompts)
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('Error in deleteTemplate:', error);
    throw error;
  }
}
