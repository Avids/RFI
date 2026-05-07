# Construction RFI Manager

A Vercel-ready static web application for managing construction Requests for Information (RFIs). It stores prototype data in the browser with `localStorage`, so it can be deployed immediately without a database while still demonstrating the complete workflow.

## Features

- Email-based account request and login flow.
- Admin approval for pending accounts.
- Company profiles with company name, address, phone, and uploadable logo.
- Project setup page for project number, name, address, city, stage, and user assignments.
- RFI creation and editing with revision, status, routing, due dates, impacts, drawing/reference fields, and copy lists.
- Threaded activity log for questions, responses, clarifications, and attachment names.
- Printable/exportable RFI sheet styled after the provided construction RFI sample.

## Demo login

Use `admin@sprint.local` to enter the seeded admin workspace. New users can request accounts from the login screen, then the admin can approve them and assign projects.

## Deploying on Vercel

This project has no external package dependencies. Vercel can serve the files in `public/` directly. The included `vercel.json` rewrites all routes to `index.html` for a simple single-page app.

```bash
npm run build
```

For local testing:

```bash
npm start
```

Open <http://localhost:3000>.
