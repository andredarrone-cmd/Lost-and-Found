# Lost & Found Management Platform

Node.js + Express + Supabase PostgreSQL + Supabase Storage web application for a school/organization lost-and-found workflow.

## What changed from the XAMPP version

The project no longer uses MySQL, `mysql2`, XAMPP, or phpMyAdmin.

- Database: Supabase PostgreSQL
- Item/lost-report images: Supabase Storage bucket `item-images` (public)
- Claim-proof images: Supabase Storage bucket `claim-proofs` (private)
- Backend API: Node.js + Express
- Authentication: existing Express-session + bcrypt authentication stored in the Supabase `users` table

The Express API and frontend routes remain compatible with the existing UI.

## Supabase setup

### 1. Create a Supabase project

Create a project at https://supabase.com/.

### 2. Run the database script

Open Supabase Dashboard -> SQL Editor and run the entire file:

`supabase-schema.sql`

The script creates:

- `users`
- `found_items`
- `lost_reports`
- `claims`
- `notifications`
- indexes and timestamp triggers
- atomic RPC functions for lost-report review and claim review
- storage buckets `item-images` and `claim-proofs`

### 3. Get the API credentials

Open Supabase Dashboard -> Project Settings -> API.

Copy:

- Project URL
- service_role key

Do not put the service_role key in frontend JavaScript. Keep it only in `.env` on the Node.js server.

### 4. Configure `.env`

Copy `.env.example` to `.env` and fill in:

```env
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
SUPABASE_STORAGE_BUCKET=item-images
SUPABASE_PROOF_BUCKET=claim-proofs
SESSION_SECRET=replace-with-a-long-random-secret
PORT=3000
```

### 5. Install dependencies

```bash
npm install
```

### 6. Create demo accounts

```bash
npm run seed
```

Demo accounts:

```text
Admin:   admin@lostfound.local / Admin@12345
Staff:   staff@lostfound.local / Staff@12345
Student: student@lostfound.local / Student@12345
```

### 7. Start the application

```bash
npm start
```

Open:

`http://localhost:3000`

## Main workflow

Student:

1. Register or log in.
2. Search found items.
3. Submit a lost report, including an optional image.
4. Submit a claim with a written proof and a required proof image.

Admin/Staff:

1. Review student lost reports.
2. Approve & Post -> creates a `found_items` record and keeps the report image.
3. Reject -> deletes the lost report and its image from Supabase Storage.
4. Review claim proof images.
5. Approve -> changes the item status to `claimed`.
6. Reject -> marks the claim rejected and sends a notification.
7. Manage item status as `found`, `claimed`, or `unfound`.

## Image storage

Uploaded item/lost-report images use the public `item-images` bucket so the public inventory can display them.

Claim-proof images use the private `claim-proofs` bucket. The admin API creates a short-lived signed URL when the Claims table is loaded.

## Existing REST-style app API

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`

### Items and student functions

- `GET /api/items`
- `GET /api/items/categories`
- `GET /api/items/:id`
- `GET /api/items/lost-reports`
- `POST /api/items/lost-reports`
- `GET /api/items/notifications`
- `POST /api/items/:id/claim`

### Admin / staff

- `GET /api/admin/stats`
- `POST /api/admin/items`
- `PUT /api/admin/items/:id`
- `PATCH /api/admin/items/:id`
- `DELETE /api/admin/items/:id`
- `GET /api/admin/lost-reports`
- `PATCH /api/admin/lost-reports/:id/review`
- `GET /api/admin/claims`
- `PATCH /api/admin/claims/:id`
- `PATCH /api/admin/items/:id/unfound`
- `GET /api/admin/users` (admin only)
- `PATCH /api/admin/users/:id/role` (admin only)
- `PATCH /api/admin/users/:id/status` (admin only)

## Notes

- XAMPP is no longer needed for this version.
- The project still runs locally through Node.js, while Supabase hosts the PostgreSQL database and image storage.
- For deployment, use a persistent production session store instead of Express's default in-memory session store.


## User-found workflow

Logged-in users can open an **Unfound** item and choose **I found this item**. They provide the location and date found. The server only allows this action when the current item status is `unfound`; `claimed` items can never be changed back to `found`.
