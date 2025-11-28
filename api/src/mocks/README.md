# Mock Data Conversion

This directory contains tools and scripts for converting MySQL JSON exports to PostgreSQL format for importing into Supabase.

## Directory Structure

```
mocks/
├── README.md                    # This file
├── convert-mysql-to-postgres.mjs # Conversion script
├── import-all.sh               # Batch import script
└── data/                       # Place your JSON files here
    ├── users.json
    ├── recommenders.json
    ├── applications.json
    ├── essays.json
    └── recommendations.json
```

## Quick Start

### 1. Place Your JSON Files

Copy your MySQL JSON export files into the `data/` directory:

```bash
cp /path/to/your/exports/*.json api/src/mocks/data/
```

### 2. Convert Individual Files

Convert a single JSON file to PostgreSQL SQL:

```bash
cd api/src/mocks
node convert-mysql-to-postgres.mjs data/users.json output/users.sql
node convert-mysql-to-postgres.mjs data/recommenders.json output/collaborators.sql
```

### 3. Convert All Files at Once

Use the batch conversion script:

```bash
./import-all.sh
```

This will:
- Convert all JSON files in `data/` directory
- Generate SQL files in `output/` directory
- Create a combined import file

### 4. Import into Supabase

Run the generated SQL files in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `output/import-all.sql`
3. Run the script
4. Verify data was imported correctly

## Table Mappings

The conversion script automatically maps old MySQL table/column names to new PostgreSQL names:

| Old MySQL | New PostgreSQL |
|-----------|---------------|
| `users` | `user_profiles` |
| `recommenders` | `collaborators` |
| `applications` | `applications` |
| `essays` | `essays` |
| `recommendations` | `recommendations` |

## Column Mappings

Column names are automatically converted from camelCase to snake_case:

| Old (camelCase) | New (snake_case) |
|----------------|------------------|
| `userId` | `user_id` |
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `emailAddress` | `email_address` |
| `phoneNumber` | `phone_number` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

## Special Handling

### Recommenders → Collaborators

The script automatically converts `recommenders` data to the `collaborators` table format:
- Maps `emailAddress` → `email`
- Sets default `relationship` to 'Recommender' if not provided
- Handles user ID mapping for foreign keys

### Foreign Key Relationships

**Important**: You must import data in the correct order to maintain foreign key relationships:

1. `user_profiles` (users)
2. `collaborators` (recommenders)
3. `applications`
4. `essays`
5. `recommendations`

The `import-all.sh` script handles this automatically.

### User ID Mapping

If your old user IDs don't match the new Supabase user IDs, create a mapping file:

```json
{
  "1": "uuid-from-supabase-1",
  "2": "uuid-from-supabase-2"
}
```

Then use it:

```bash
node convert-mysql-to-postgres.mjs data/applications.json output/applications.sql --user-id-map user-id-map.json
```

## Options

### Preserve Original IDs

By default, the script removes `id` fields to let PostgreSQL auto-generate them. To preserve IDs:

```bash
node convert-mysql-to-postgres.mjs data/applications.json output/applications.sql --preserve-ids
```

**Warning**: Only use `--preserve-ids` if you're sure the IDs won't conflict with existing data.

## Troubleshooting

### "Foreign key constraint violation"

This means you're trying to insert data that references a table that hasn't been imported yet. Make sure to import in the correct order (see above).

### "Duplicate key value"

The script uses `ON CONFLICT DO NOTHING` to handle duplicates. If you're getting errors, check:
- Are you importing the same data twice?
- Are IDs conflicting with existing data?

### "Invalid date format"

MySQL dates might be in a different format. The script tries to handle common formats, but you may need to manually fix date fields in the generated SQL.

## Manual Adjustments

After conversion, you may need to manually adjust:

1. **auth_user_id**: Replace with actual Supabase auth user UUIDs
2. **Date formats**: Ensure dates are in ISO format or PostgreSQL DATE format
3. **Enum values**: Ensure enum values match your PostgreSQL enum types
4. **NULL handling**: Check that NULL values are handled correctly

## Example Workflow

```bash
# 1. Copy JSON files
cp ~/Downloads/mysql-export/*.json api/src/mocks/data/

# 2. Convert all files
cd api/src/mocks
./import-all.sh

# 3. Review generated SQL
cat output/import-all.sql

# 4. Import into Supabase
# Copy output/import-all.sql content into Supabase SQL Editor and run
```

## Notes

- The conversion script preserves data types where possible
- Timestamps are converted to PostgreSQL TIMESTAMPTZ format
- Boolean values are converted to PostgreSQL BOOLEAN
- Arrays are converted to PostgreSQL array syntax
- The script uses transactions (BEGIN/COMMIT) for safe imports

