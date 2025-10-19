/**
 * Template Detail API Route
 * Story 1.3: Template Data Model and Storage
 *
 * Endpoints:
 * - GET    /api/templates/:id - Get template by ID with fields and prompts
 * - PUT    /api/templates/:id - Update template
 * - DELETE /api/templates/:id - Delete template (cascade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate
} from '@/lib/db/templates';

// Zod validation schema for updating a template
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  template_type: z
    .enum([
      'invoice',
      'estimate',
      'equipment_log',
      'timesheet',
      'consumable_log',
      'generic'
    ])
    .optional(),
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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/templates/:id
 * Retrieve a single template with all related fields and prompts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📄 Fetching template: ${id}`);

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const template = await getTemplateById(id);

    if (!template) {
      console.log(`❌ Template not found: ${id}`);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template retrieved: ${template.name}`);

    return NextResponse.json({
      template,
      fields: template.fields || [],
      prompts: template.prompts || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/:id
 * Update an existing template and optionally replace fields/prompts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`✏️ Updating template: ${id}`);

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = updateTemplateSchema.safeParse(body);

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

    // Update template
    const template = await updateTemplate(id, data);

    console.log(`✅ Template updated: ${template.name}`);

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('❌ Error updating template:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update template', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/:id
 * Delete a template and cascade delete all related fields and prompts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ Deleting template: ${id}`);

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    await deleteTemplate(id);

    console.log(`✅ Template deleted: ${id}`);

    return NextResponse.json({
      success: true,
      id
    });
  } catch (error: any) {
    console.error('❌ Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template', details: error.message },
      { status: 500 }
    );
  }
}
