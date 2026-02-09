
# Admin Setup Guide

## 1. Prerequisites
Ensure you have the necessary dependencies installed:
```bash
npm install marked pinia
```

## 2. Default User Role
By default, any new user registered through the app is assigned the role `user`.

## 3. Promoting a User to Superadmin
To enable admin features (Edit/Add Novel, Add Chapter), you must promote a user to `superadmin`.

1.  **Register** a new account in the app.
2.  **Run the following SQL command** in your Supabase SQL Editor:

```sql
update profiles
set role = 'superadmin'
where username = 'YOUR_USERNAME'; -- Replace with the username you registered with
```
or 
```sql
update profiles
set role = 'superadmin'
where id = 'USER_UUID_FROM_AUTH_USERS';
```

## 4. Admin Features
Once promoted, you will see new buttons in the UI:
- **Global Header**: `+ Add Novel` (visible on desktop).
- **Novel Page**: `Edit Novel` button near "Start Reading". `+ ADD CHAPTER` button near the chapter list.
- **Chapter Page**: `Edit` button near the chapter title/number in the header.

## 5. Security
- Only users with `role = 'superadmin'` can insert, update, or delete novels and chapters.
- RLS policies enforce these rules on the database level.
