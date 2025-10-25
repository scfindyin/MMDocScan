/**
 * Templates API Route
 * Reverted from Story 3.4 authentication to single-user mode
 *
 * CHANGE from Story 3.4:
 * - Removed authentication requirement (no server-side auth client)
 * - Uses Epic 3 schema (JSONB fields) but WITHOUT user_id or RLS
 * - Returns templates without authentication checks
 *
 * Endpoints:
 * - GET  /api/templates - List all templates (no auth)
 * - POST /api/templates - Create a new template (no auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createTemplate, getTemplates } from '@/lib/db/templates';
import { CreateTemplateSchema } from '@/lib/validation/templates';

/**
 * GET /api/templates
 * List all templates (no authentication)
 *
 * Authentication: NOT REQUIRED (single-user mode)
 * Returns: 200 with Template[], 500 on error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/templates - Fetching templates...');

    // Fetch templates (no authentication required)
    const templates = await getTemplates(supabase);

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
 * Create a new template
 *
 * Authentication: NOT REQUIRED (single-user mode)
 * Body: { name, fields, extraction_prompt? }
 * Returns: 201 with created Template, 400 for validation errors, 500 on error
 */
export async function POST(request: NextRequest) {
  try {
    console.log('➕ POST /api/templates - Creating new template...');

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

    // Create template (no authentication required)
    const template = await createTemplate(supabase, data);

    console.log(`✅ Template created: ${template.id} (${template.name})`);

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
