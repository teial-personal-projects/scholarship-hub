/**
 * Collaborators Service
 * Business logic for collaborator management
 */

import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

/**
 * Get all collaborators for a user
 */
export const getUserCollaborators = async (userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get single collaborator by ID
 */
export const getCollaboratorById = async (collaboratorId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Collaborator not found', 404);
    }
    throw error;
  }

  return data;
};

/**
 * Create new collaborator
 */
export const createCollaborator = async (
  userId: number,
  collaboratorData: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    relationship?: string;
    phoneNumber?: string;
  }
) => {
  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {
    user_id: userId,
    first_name: collaboratorData.firstName,
    last_name: collaboratorData.lastName,
    email_address: collaboratorData.emailAddress,
  };

  if (collaboratorData.relationship !== undefined) dbData.relationship = collaboratorData.relationship;
  if (collaboratorData.phoneNumber !== undefined) dbData.phone_number = collaboratorData.phoneNumber;

  const { data, error } = await supabase
    .from('collaborators')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update collaborator
 */
export const updateCollaborator = async (
  collaboratorId: number,
  userId: number,
  updates: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    relationship?: string;
    phoneNumber?: string;
  }
) => {
  // First verify the collaborator belongs to the user
  await getCollaboratorById(collaboratorId, userId);

  // Convert camelCase to snake_case
  const dbUpdates: Record<string, unknown> = {};

  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.emailAddress !== undefined) dbUpdates.email_address = updates.emailAddress;
  if (updates.relationship !== undefined) dbUpdates.relationship = updates.relationship;
  if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;

  const { data, error } = await supabase
    .from('collaborators')
    .update(dbUpdates)
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete collaborator
 */
export const deleteCollaborator = async (collaboratorId: number, userId: number) => {
  // First verify the collaborator belongs to the user
  await getCollaboratorById(collaboratorId, userId);

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('user_id', userId);

  if (error) throw error;
};

