import type { UserSearchPreferences } from './user-search-preferences.types.js';

export interface User {
  userId: number;
  authUserId: string; // Supabase Auth user ID
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  searchPreferences?: UserSearchPreferences;
  createdAt?: Date;
  updatedAt?: Date;
} 