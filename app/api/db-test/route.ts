import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Database Connection Test API Route
 *
 * Tests the Supabase database connection by executing a simple query.
 * Returns connection status and test data.
 *
 * @returns JSON response with connection status
 */
export async function GET(request: NextRequest) {
  try {
    // Execute a simple test query to verify database connection
    // Using a raw SQL query to get the current timestamp from PostgreSQL
    const { data, error } = await supabase
      .from('_dummy_table_for_connection_test')
      .select('*')
      .limit(1);

    // Note: This query will fail if the table doesn't exist, but that's expected
    // The important part is that we can communicate with Supabase
    // For a proper connection test, we'll check if the error is a "connection" error
    // vs a "table doesn't exist" error (which means the connection is working)

    if (error) {
      // Check if the error is due to missing table (which means connection works)
      // Supabase/PostgREST returns PGRST205 or messages containing "Could not find the table"
      const isTableNotFoundError =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('does not exist') ||
        error.message.includes('Could not find the table');

      if (isTableNotFoundError) {
        // Connection is working, just no tables yet (expected for Story 1.2)
        return NextResponse.json(
          {
            success: true,
            message: 'Database connection successful (no tables created yet)',
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Log the error for debugging (server-side only)
      console.error('Database connection test failed:', error.message, error.code);

      // Return user-friendly error without exposing sensitive details
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection failed',
          error: 'Unable to connect to database',
        },
        { status: 500 }
      );
    }

    // Connection successful and query returned data
    return NextResponse.json(
      {
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        rowCount: data?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error during database connection test:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Database connection test failed',
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
