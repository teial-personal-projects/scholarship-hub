# Database Migrations

This directory contains SQL migration scripts for the ScholarshipHub database. Migrations should be run in sequential order.

## Migration Files

1. **001_users_profiles.sql** - Core user tables and authentication
2. **002_applications.sql** - Scholarship applications
3. **003_essays.sql** - Essays associated with applications
4. **004_collaborators.sql** - Collaborators and collaborations system
5. **005_recommendations.sql** - Recommendation letters
6. **006_add_user_id_to_collaborations.sql** - Add user_id to collaborations
7. **007_collaborations_invitation.sql** - Collaborations invitation system
8. **008_notification_preferences.sql** - User notification preferences
9. **009_reminder_tracking.sql** - Reminder tracking system
10. **010_rename_collaborators_email_to_email_address.sql** - Rename email field
11. **011_remove_portal_deadline.sql** - Remove portal deadline field
12. **012_add_scholarships_tables.sql** - Automated scholarship discovery system tables

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for First-Time Setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. For each migration file (in order):
   - Open the file
   - Copy its contents
   - Paste into SQL Editor
   - Click "Run"
   - Verify success message
4. Check **Table Editor** to verify tables were created

### Option 2: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### Option 3: Manual Execution

If you need to run migrations manually via `psql`:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run migrations in order
\i 001_users_profiles.sql
\i 002_applications.sql
\i 003_essays.sql
\i 004_collaborators.sql
\i 005_recommendations.sql
```

## Migration Checklist

Before running migrations:

- [ ] Supabase project is created and configured
- [ ] `.env.local` file has correct Supabase credentials
- [ ] You have admin access to the Supabase project
- [ ] You've reviewed the migration files

After running migrations:

- [ ] All migrations executed successfully
- [ ] Tables appear in Supabase Table Editor
- [ ] RLS policies are enabled (check in Table Editor)
- [ ] Test data can be inserted (see `test_data.sql`)

## Testing the Schema

After running all migrations, you can test the schema with sample data:

1. Create a test user via Supabase Auth (Dashboard → Authentication)
2. Edit `test_data.sql` to use your test user's `auth_user_id`
3. Run `test_data.sql` in Supabase SQL Editor
4. Verify data was inserted correctly

See `test_data.sql` for detailed instructions.

## Backup Before Migrations

**Always backup your database before running migrations in production!**

```bash
./scripts/backup-db.sh
```

Or use Supabase dashboard:
- Go to Settings → Database
- Click "Backup" to create a manual backup

## Troubleshooting

### Migration Fails

1. **Check error message** - Supabase SQL Editor shows specific errors
2. **Verify dependencies** - Ensure previous migrations have run
3. **Check for conflicts** - Enums, tables, or functions may already exist
4. **Review RLS policies** - Some policies may conflict

### Common Issues

**"relation already exists"**
- Migration was already run
- Check Table Editor to see if tables exist
- Skip the migration or drop existing objects (careful!)

**"type already exists"**
- Enum type was already created
- Check if enum exists: `SELECT typname FROM pg_type WHERE typname = 'enum_name';`

**"function already exists"**
- Function (like `update_updated_at_column`) already exists
- This is okay - the function is idempotent

**RLS Policy Errors**
- Policies may conflict if run multiple times
- Drop and recreate: `DROP POLICY IF EXISTS "policy_name" ON table_name;`

## Rollback

Supabase doesn't provide automatic rollback. To rollback:

1. **Manual rollback** - Write reverse migration scripts
2. **Restore from backup** - Use Supabase backup restore feature
3. **Drop and recreate** - Drop affected tables and re-run migrations

**⚠️ Warning**: Rollback can cause data loss. Always backup first!

## Adding New Migrations

When creating a new migration:

1. **Number sequentially**: `006_[name].sql`, `007_[name].sql`, etc.
2. **Document in `docs/database-schema.md`**
3. **Test thoroughly** in development first
4. **Update this README** with the new migration
5. **Create test data** if applicable

## Migration Best Practices

1. ✅ **Run in order** - Migrations have dependencies
2. ✅ **Test first** - Use a development/test Supabase project
3. ✅ **Backup first** - Always backup before production migrations
4. ✅ **Document changes** - Update schema documentation
5. ✅ **Use transactions** - Wrap migrations in transactions when possible
6. ✅ **Idempotent** - Make migrations safe to run multiple times (use `IF NOT EXISTS`)

## Resources

- [Database Schema Documentation](../../../docs/database-schema.md)
- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

