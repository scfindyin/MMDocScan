/**
 * Templates API Route
 * Story 3.4: Template CRUD API Endpoints - Epic 3 Schema
 *
 * BREAKING CHANGE from Story 1.3:
 * - Now requires authentication (server-side Supabase client)
 * - Uses Epic 3 schema (JSONB fields, user_id, RLS)
 * - Returns 401 if not authenticated
 *
 * Endpoints:
 * - GET  /api/templates - List user's templates (with RLS)
 * - POST /api/templates - Create a new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createTemplate, getTemplates } from '@/lib/db/templates';
import { CreateTemplateSchema } from '@/lib/validation/templates';

/**
 * GET /api/templates
 * List user's templates (RLS-filtered)
 *
 * Authentication: REQUIRED
 * Returns: 200 with Template[], 401 if not authenticated, 500 on error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/templates - Fetching user templates...');

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

    // Fetch templates (RLS automatically filters to user's templates)
    const templates = await getTemplates(supabase);

    console.log(`✅ Retrieved ${templates.length} templates for user ${user.id}`);

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
 * Create a new template
 *
 * Authentication: REQUIRED
 * Body: { name, fields, extraction_prompt? }
 * Returns: 201 with created Template, 400 for validation errors, 401 if not authenticated, 500 on error
 */
export async function POST(request: NextRequest) {
  try {
    console.log('➕ POST /api/templates - Creating new template...');

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
    const validationResult = CreateTemplateSchema.safeParse(body);

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

    // Create template (RLS automatically sets user_id from auth.uid())
    const template = await createTemplate(supabase, data);

    console.log(`✅ Template created: ${template.id} (${template.name}) for user ${user.id}`);

    return NextResponse.json(
      { template },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating template:', error);

    // Handle duplicate template name error
    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'A template with this name already exists', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
}
