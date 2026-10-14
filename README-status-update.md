# Lost Item Status Update

This update changes approved student lost reports so they appear in Manage Items as `Unfound` until physically recovered.

## Workflow

Student lost report -> Admin approves -> Manage Items (`Unfound`) -> Admin/Staff clicks `Mark as Found` -> item becomes `Found` and can then be claimed.

Claimed items are terminal for status changes: they cannot be changed back to `Found` or `Unfound`.

## Database migration for an existing Supabase project

Run `database-migration-lost-status.sql` once in Supabase SQL Editor.
