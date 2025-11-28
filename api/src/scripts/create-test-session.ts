/**
 * Create a test session token for user testing
 * Run with: npx tsx src/scripts/create-test-session.ts
 */

import { supabase } from '../config/supabase.js';

async function createTestSession() {
  const testEmail = 'teial.dickens@gmail.com';
  const authUserId = 'fcb86d3c-aa8c-4245-931b-a584ac4afbe0';

  try {
    // Create a session using admin API
    const { data, error } = await supabase.auth.admin.createSession({
      session: {
        user_id: authUserId,
        // Session expires in 1 hour
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    if (error) {
      console.error('❌ Error creating session:', error);
      process.exit(1);
    }

    console.log('✅ Test session created successfully!\n');
    console.log('🔑 Access Token (copy this):');
    console.log(data.access_token);
    console.log('\n📝 Test with curl:');
    console.log(`curl http://localhost:3001/api/applications \\`);
    console.log(`  -H "Authorization: Bearer ${data.access_token}"`);
    console.log('');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

createTestSession();
