# Database Migration: User-Specific Compartments

## Overview
The application has been updated to store compartments in the database instead of localStorage, allowing each user to have their own custom compartments. This migration adds multi-user support and properly secures data.

## 🚀 Migration Steps

### 1. Run the Database Migration
Execute the SQL migration script in your Supabase SQL editor:

```bash
# In Supabase Dashboard > SQL Editor, run:
/Users/ced/DEV/htdocs/kanban/migration-compartments.sql
```

This will:
- ✅ Create the `compartments` table with user-specific data
- ✅ Add user_id columns to existing tables
- ✅ Enable Row Level Security (RLS) for data isolation
- ✅ Update security policies to be user-specific
- ✅ Add necessary indexes for performance

### 2. Verify Migration Success
After running the migration, check that:

```sql
-- Check compartments table exists
SELECT * FROM compartments LIMIT 1;

-- Check tasks table has user_id column
SELECT user_id FROM tasks LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('compartments', 'tasks', 'quick_tasks');
```

### 3. Test the Application
1. **Start the dev server**: `npm run dev`
2. **Sign in** with a user account
3. **Open Settings modal** (top-right menu → Settings)
4. **Verify compartments load** - should show default compartments for new users
5. **Test compartment management**:
   - Add a new compartment
   - Edit compartment names
   - Reorder compartments by dragging
   - Delete compartments (with validation)
6. **Test drag & drop** - drag tasks to newly created compartments
7. **Test data persistence** - refresh page, compartments should be preserved

## 🔧 What Changed

### Database Schema
- **New `compartments` table**: Stores user-specific compartments with colors and positions
- **Updated `tasks` table**: Added user_id foreign key constraint
- **Updated `quick_tasks` table**: Added user_id foreign key constraint
- **Row Level Security**: Enabled to ensure users only see their own data

### Code Changes
- **New `compartmentService.js`**: CRUD operations for compartments
- **New `useCompartments.js` hook**: State management for compartments
- **Updated `SettingsModal.jsx`**: Now uses database instead of localStorage
- **Updated `App.jsx`**: Uses dynamic compartments from database
- **Updated `taskService.js`**: All operations now filter by user_id
- **Updated `useTasks.js`**: Listens for compartment changes from database

### Migration Features
- **Automatic localStorage migration**: Existing compartments from localStorage are automatically moved to database on first login
- **Default compartments**: New users get default compartments (PM, CPO, FER, NOVAE, MRH, CDA)
- **Real-time updates**: Changes in Settings modal immediately update the board
- **Data validation**: Prevents duplicate compartment names and enforces minimum one compartment

## 🔒 Security Improvements
- **User isolation**: Each user can only see/modify their own compartments and tasks
- **RLS policies**: Database-level security prevents cross-user data access
- **Authentication required**: All operations require valid user session

## 🐛 Troubleshooting

### "User not authenticated" errors
- Ensure user is signed in before accessing compartments
- Check Supabase auth configuration

### Compartments not loading
- Verify the migration script ran successfully
- Check browser console for errors
- Ensure RLS policies are properly configured

### Drag & drop not working for new compartments
- This was the original issue - now fixed!
- New compartments are immediately available for drag & drop operations

### Database connection issues
- Verify Supabase connection in `/src/services/supabase.js`
- Check environment variables are set correctly

## 📁 Files Modified

### New Files
- `migration-compartments.sql` - Database migration script
- `src/services/compartmentService.js` - Compartment CRUD operations
- `src/hooks/useCompartments.js` - Compartment state management
- `DATABASE_MIGRATION_INSTRUCTIONS.md` - This file

### Modified Files
- `src/components/SettingsModal.jsx` - Updated to use database
- `src/App.jsx` - Uses dynamic compartments from database
- `src/services/taskService.js` - Added user filtering to all operations
- `src/hooks/useTasks.js` - Listens for compartment updates
- `src/utils/constants.js` - Deprecated localStorage functions
- `src/utils/helpers.js` - Updated to use default compartments

## ✅ Success Criteria
The migration is successful when:
1. Users can sign in and see their own compartments
2. New users get default compartments automatically
3. Settings modal allows full compartment management (CRUD + reorder)
4. Drag & drop works for all compartments, including newly created ones
5. Data persists across browser sessions
6. Multiple users have isolated data (no cross-user access)

## 🚀 Next Steps
After successful migration, consider:
- Adding compartment color customization in the UI
- Implementing compartment templates
- Adding bulk compartment operations
- Migrating existing production data if needed