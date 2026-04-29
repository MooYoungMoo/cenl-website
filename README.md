# ChemoElectronic Nanomaterials Lab (CENL) Website

Frontend-only Next.js project for a modern academic research lab website.

## Included Pages

- Home
- Research
- Members
- PI detail page
- Lab members page
- Publications
- Papers page
- Patents page
- News listing
- News detail pages
- Contact
- Lab Portal
- Portal Login
- Purchase Request
- Budget Dashboard
- Approval History
- Receipts
- Admin

## Stack

- Next.js
- TypeScript
- Tailwind CSS

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`

## Environment Variables

Create a local `.env.local` file using `.env.local.example` as a template.
Do not commit real Supabase keys or service role keys.

To test Lab Portal login locally, create a Supabase Auth user in your Supabase
project, add the public project URL and anon key to `.env.local`, then run
`npm run dev` and sign in at `/portal/login`.

## Notes

- This project currently includes frontend structure and UI only.
- Authentication is not connected yet.
- No database is connected yet.
- No real purchasing, payment, or budget workflow is implemented yet.
