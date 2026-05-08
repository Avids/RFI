# Construction RFI Manager

A Vercel-ready static web application for managing construction Requests for Information (RFIs). It stores prototype data in the browser with `localStorage`, so it can be deployed immediately without a database while still demonstrating the complete workflow.

## Features

- Email-based account request and login flow.
- Admin approval for pending accounts.
- Company profiles with company name, address, phone, and uploadable logo.
- Project setup page for project number, name, address, city, stage, and user assignments.
- RFI creation and editing with revision, status, routing, due dates, impacts, drawing/reference fields, and copy lists.
- Threaded activity log for questions, responses, clarifications, and multiple attachment types.
- Search across RFI titles, questions, responses, and clarifications.
- Saved receiver-name suggestions for To, From, Received From, and Copies To fields.
- Optional Supabase database sync for the shared RFI data store.
- User-selectable PDF attachments can be appended to the printed/exported RFI.
- Printable/exportable RFI sheet styled after the provided construction RFI sample with tighter PDF-like typography and footer.

## Demo login

Use `admin@sprint.local` to enter the seeded admin workspace. New users can request accounts from the login screen, then the admin can approve them and assign projects.

## Deploying on Vercel

This project has no external package dependencies. Vercel can serve the files in `public/` directly. The included `vercel.json` rewrites all routes to `index.html` for a simple single-page app. For shared data, open the Database tab in the app and enter Supabase REST credentials.

```bash
npm run build
```

For local testing:

```bash
npm start
```

Open <http://localhost:3000>.


## Optional Supabase database

Create a table named `rfi_store` in Supabase, then save your project URL and API key in the app's Database tab. The app stores one JSON document containing companies, users, projects, receiver suggestions, RFIs, threads, and attachment metadata/content.

```sql
create table if not exists rfi_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
```

Use **Pull Database** to load the shared data and **Push Database** to save it. Enable auto-push if each save should immediately sync to Supabase.
