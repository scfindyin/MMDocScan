/**
 * Extraction Data Access Layer
 * Story 2.9: Extraction Session Management
 *
 * Database utility functions for extraction record CRUD operations
 * Provides separation of concerns between API routes and database logic
 */

import { supabase } from '@/lib/supabase';
import {
  ExtractionRecord,
  ExtractionListItem,
  ExtractionDetail,
  CreateExtractionRequest,
} from '@/types/extraction';

/**
 * Create a new extraction record
 * Automatically enforces 10-item limit via database trigger
 */
export async function createExtraction(
  data: CreateExtractionRequest
): Promise<ExtractionRecord> {
  try {
    const { data: extraction, error } = await supabase
      .from('extractions')
      .insert({
        template_id: data.template_id,
        filename: data.filename,
        extracted_data: data.extracted_data,
        row_count: data.row_count,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create extraction: ${error.message}`);
    }

    if (!extraction) {
      throw new Error('Extraction created but no data returned');
    }

    return extraction as ExtractionRecord;
  } catch (error: any) {
    console.error('Error in createExtraction:', error);
    throw error;
  }
}

/**
 * Get 10 most recent extractions with template name (JOIN)
 * Sorted by created_at DESC (newest first)
 */
export async function getRecentExtractions(): Promise<ExtractionListItem[]> {
  try {
    // Fetch extractions with template JOIN
    // Supabase automatically handles the foreign key relationship
    const { data: extractions, error } = await supabase
      .from('extractions')
      .select(`
        id,
        template_id,
        filename,
        row_count,
        created_at,
        templates (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch recent extractions: ${error.message}`);
    }

    if (!extractions || extractions.length === 0) {
      return [];
    }

    // Transform the nested templates structure to flat structure
    return extractions.map((extraction: any) => ({
      id: extraction.id,
      template_id: extraction.template_id,
      template_name: extraction.templates?.name || 'Unknown Template',
      filename: extraction.filename,
      row_count: extraction.row_count,
      created_at: extraction.created_at,
    }));
  } catch (error: any) {
    console.error('Error in getRecentExtractions:', error);
    throw error;
  }
}

/**
 * Get a single extraction by ID with full extracted_data
 * Includes template name via JOIN
 */
export async function getExtractionById(
  id: string
): Promise<ExtractionDetail | null> {
  try {
    const { data: extraction, error } = await supabase
      .from('extractions')
      .select(`
        id,
        template_id,
        filename,
        extracted_data,
        row_count,
        created_at,
        templates (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch extraction: ${error.message}`);
    }

    if (!extraction) {
      return null;
    }

    // Transform the nested structure to flat ExtractionDetail
    return {
      id: extraction.id,
      template_id: extraction.template_id,
      filename: extraction.filename,
      extracted_data: extraction.extracted_data as any,
      row_count: extraction.row_count,
      created_at: extraction.created_at,
      template_name: (extraction.templates as any)?.name || 'Unknown Template',
    };
  } catch (error: any) {
    console.error('Error in getExtractionById:', error);
    throw error;
  }
}

/**
 * Delete all extractions from the database
 * Used for "Clear History" functionality
 */
export async function deleteAllExtractions(): Promise<number> {
  try {
    // Get count before deletion
    const { count: initialCount, error: countError } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count extractions: ${countError.message}`);
    }

    // Delete all records
    const { error: deleteError } = await supabase
      .from('extractions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (dummy condition that's always true for valid UUIDs)

    if (deleteError) {
      throw new Error(`Failed to delete extractions: ${deleteError.message}`);
    }

    return initialCount || 0;
  } catch (error: any) {
    console.error('Error in deleteAllExtractions:', error);
    throw error;
  }
}

/**
 * Delete extractions older than specified number of days
 * Used for automatic cleanup (7-day expiry)
 * Returns count of deleted records
 */
export async function deleteOldExtractions(daysOld: number = 7): Promise<number> {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Get count of records to be deleted
    const { count: deleteCount, error: countError } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString());

    if (countError) {
      throw new Error(`Failed to count old extractions: ${countError.message}`);
    }

    // Delete old records
    const { error: deleteError } = await supabase
      .from('extractions')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (deleteError) {
      throw new Error(`Failed to delete old extractions: ${deleteError.message}`);
    }

    return deleteCount || 0;
  } catch (error: any) {
    console.error('Error in deleteOldExtractions:', error);
    throw error;
  }
}
