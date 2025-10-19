/**
 * Templates API Route
 * Story 1.3: Template Data Model and Storage
 *
 * Endpoints:
 * - GET  /api/templates - List all templates
 * - POST /api/templates - Create a new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTemplate, getTemplates } from '@/lib/db/templates';
import { TemplateType, FieldType, PromptType } from '@/types/template';

// Zod validation schema for creating a template
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  template_type: z.enum([
    'invoice',
    'estimate',
    'equipment_log',
    'timesheet',
    'consumable_log',
    'generic'
  ]),
  fields: z
    .array(
      z.object({
        field_name: z.string().min(1),
        field_type: z.string(),
        is_header: z.boolean(),
        display_order: z.number().int().min(0)
      })
    )
    .optional(),
  prompts: z
    .array(
      z.object({
        prompt_text: z.string().min(1),
        prompt_type: z.string()
      })
    )
    .optional()
});

/**
 * GET /api/templates
 * Retrieve all templates (basic fields only)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching all templates...');

    const templates = await getTemplates();

    console.log(`✅ Retrieved ${templates.length} templates`);

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('❌ Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template with optional fields and prompts
 */
export async function POST(request: NextRequest) {
  try {
    console.log('➕ Creating new template...');

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = createTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create template
    const template = await createTemplate(data);

    console.log(`✅ Template created: ${template.id} (${template.name})`);

    return NextResponse.json(
      { template },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
}
