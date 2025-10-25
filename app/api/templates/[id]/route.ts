/**
 * Template Detail API Route
 * Story 3.4: Template CRUD API Endpoints - Epic 3 Schema
 *
 * BREAKING CHANGE from Story 1.3:
 * - Now requires authentication (server-side Supabase client)
 * - Uses Epic 3 schema (JSONB fields, user_id, RLS)
 * - Returns 401 if not authenticated, 404 if not found or not owned by user
 *
 * Endpoints:
 * - GET    /api/templates/:id - Get template by ID (RLS-filtered)
 * - PUT    /api/templates/:id - Update template (RLS-filtered)
 * - DELETE /api/templates/:id - Delete template (RLS-filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
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
 * Get single template by ID (RLS-filtered)
 *
 * Authentication: REQUIRED
 * Returns: 200 with Template, 400 for invalid UUID, 401 if not authenticated,
 *          404 if not found or not owned by user, 500 on error
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

    // Create server-side Supabase client with auth context
    const supabase = createClient();

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    // Fetch template (RLS automatically filters to user's templates)
    const template = await getTemplateById(supabase, id);

    if (!template) {
      console.log(`❌ Template not found or access denied: ${id}`);
      // Security: Don't reveal whether template exists or is just inaccessible
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template retrieved: ${template.name} for user ${user.id}`);

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
 * Update template (RLS-filtered)
 *
 * Authentication: REQUIRED
 * Body: { name?, fields?, extraction_prompt? }
 * Returns: 200 with updated Template, 400 for validation errors or invalid UUID,
 *          401 if not authenticated, 404 if not found or not owned by user, 500 on error
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

    // Create server-side Supabase client with auth context
    const supabase = createClient();

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ Authenticated user: ${user.id}`);

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

    // Update template (RLS automatically filters to user's templates)
    const template = await updateTemplate(supabase, id, data);

    if (!template) {
      console.log(`❌ Template not found or access denied: ${id}`);
      // Security: Don't reveal whether template exists or is just inaccessible
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template updated: ${template.name} for user ${user.id}`);

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
 * Delete template (RLS-filtered)
 *
 * Authentication: REQUIRED
 * Returns: 200 with success message, 400 for invalid UUID, 401 if not authenticated,
 *          404 if not found or not owned by user, 500 on error
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

    // Create server-side Supabase client with auth context
    const supabase = createClient();

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    // Delete template (RLS automatically filters to user's templates)
    const deleted = await deleteTemplate(supabase, id);

    if (!deleted) {
      console.log(`❌ Template not found or access denied: ${id}`);
      // Security: Don't reveal whether template exists or is just inaccessible
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Template deleted: ${id} for user ${user.id}`);

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
