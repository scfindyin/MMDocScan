/**
 * Template Detail API Route
 * Reverted from Story 3.4 authentication to single-user mode
 *
 * CHANGE from Story 3.4:
 * - Removed authentication requirement (no server-side auth client)
 * - Uses Epic 3 schema (JSONB fields) but WITHOUT user_id or RLS
 * - Returns 404 if not found (no auth checks)
 *
 * Endpoints:
 * - GET    /api/templates/:id - Get template by ID (no auth)
 * - PUT    /api/templates/:id - Update template (no auth)
 * - DELETE /api/templates/:id - Delete template (no auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate
} from '@/lib/db/templates';
import {
  UpdateTemplateSchema,
  safeValidateTemplateId
} from '@/lib/validation/templates';

/**
 * GET /api/templates/:id
 * Get single template by ID (no authentication)
 *
 * Authentication: NOT REQUIRED (single-user mode)
 * Returns: 200 with Template, 400 for invalid UUID, 404 if not found, 500 on error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📄 GET /api/templates/${id} - Fetching template...`);

    // Validate UUID format
    const idValidation = safeValidateTemplateId(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Fetch template (no authentication required)
    const template = await getTemplateById(supabase, id);

    if (!template) {
      console.log(`❌ Template not found: ${id}`);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template retrieved: ${template.name}`);

    return NextResponse.json({ template });
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
 * Update template (no authentication)
 *
 * Authentication: NOT REQUIRED (single-user mode)
 * Body: { name?, fields?, extraction_prompt? }
 * Returns: 200 with updated Template, 400 for validation errors or invalid UUID,
 *          404 if not found, 500 on error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`✏️ PUT /api/templates/${id} - Updating template...`);

    // Validate UUID format
    const idValidation = safeValidateTemplateId(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateTemplateSchema.safeParse(body);

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

    // Update template (no authentication required)
    const template = await updateTemplate(supabase, id, data);

    if (!template) {
      console.log(`❌ Template not found: ${id}`);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template updated: ${template.name}`);

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('❌ Error updating template:', error);

    // Handle duplicate template name error
    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'A template with this name already exists', details: error.message },
        { status: 400 }
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
 * Delete template (no authentication)
 *
 * Authentication: NOT REQUIRED (single-user mode)
 * Returns: 200 with success message, 400 for invalid UUID, 404 if not found, 500 on error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ DELETE /api/templates/${id} - Deleting template...`);

    // Validate UUID format
    const idValidation = safeValidateTemplateId(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Delete template (no authentication required)
    const deleted = await deleteTemplate(supabase, id);

    if (!deleted) {
      console.log(`❌ Template not found: ${id}`);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template deleted: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error: any) {
    console.error('❌ Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template', details: error.message },
      { status: 500 }
    );
  }
}
