# Admin Account Guide

## Overview

An admin account has been created that can view and manage all transfers across all locations.

## Admin Credentials

**Username**: `admin`  
**Password**: `admin123`

⚠️ **IMPORTANT**: Change the admin password after first login!

## Admin Capabilities

### 1. View All Transfers
- Admins can see **all transfers** across all locations
- Regular users only see transfers they sent or received
- The dashboard shows all transfers without filtering

### 2. Update Any Transfer
- Admins can update the status and notes of **any transfer**
- Regular users can only update transfers they received
- Admin updates are clearly labeled in the UI

### 3. Access All Transfer Details
- Admins can view details of any transfer
- Regular users can only view transfers they're involved in

## Visual Indicators

When logged in as admin, you'll see:
- **Purple "Admin" badge** in the navigation bar
- **"Admin: Update Transfer"** label when updating transfers
- **All transfers** visible on the dashboard (no sent/received filters)

## Database Schema

The `User` model now includes an `isAdmin` boolean field:
- Default: `false`
- Set to `true` for admin accounts

## Creating Additional Admin Accounts

To create additional admin accounts, you can:

1. **Via Database** (SQLite):
   ```sql
   UPDATE User SET isAdmin = 1 WHERE username = 'username';
   ```

2. **Via Prisma Studio**:
   ```bash
   npx prisma studio
   ```
   Then edit the user and set `isAdmin` to `true`

3. **Via Seed Script**:
   Edit `scripts/seed.ts` and add admin users similar to the existing admin user

## Security Notes

- Admin status is checked on the server side for all operations
- Admin status is included in the session but verified from the database
- Regular users cannot access admin-only features even if they modify client-side code
- All API routes properly check admin status before allowing access

## API Changes

### `/api/transfers` (GET)
- **Regular users**: Returns only transfers where user is sender or recipient
- **Admins**: Returns all transfers

### `/api/transfers/[id]` (GET)
- **Regular users**: Can only view transfers they're involved in
- **Admins**: Can view any transfer

### `/api/transfers/[id]` (PATCH)
- **Regular users**: Can only update transfers they received
- **Admins**: Can update any transfer

## Testing Admin Features

1. Log in as admin: `admin` / `admin123`
2. Verify you see the purple "Admin" badge
3. Check the dashboard - you should see all transfers from all locations
4. Open any transfer - you should be able to update it
5. Log in as a regular user - verify you only see your own transfers

## Future Enhancements

Potential admin-only features to add:
- User management (create/edit/delete users)
- System statistics and reports
- Audit logs
- Bulk operations
- Export functionality

