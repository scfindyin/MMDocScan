# MMDocScan

AI-Powered Document Data Extraction Tool

## Overview

MMDocScan is a Next.js application that enables users to create document templates and extract structured data from documents using AI-powered OCR and natural language processing.

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript 5.3+
- **Styling:** Tailwind CSS 3.4+
- **UI Components:** ShadCN (Radix UI + Tailwind)
- **Database:** Supabase PostgreSQL
- **Deployment:** Vercel

## Local Development Setup

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MMDocScan
```

2. Install dependencies:
```bash
npm install
```

3. Configure Supabase database connection:

   a. Create a Supabase project at [https://supabase.com](https://supabase.com)

   b. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   c. Get your Supabase credentials from Project Settings → API:
      - Project URL
      - Anon/Public Key

   d. Update `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   e. Verify the connection by starting the dev server and visiting:
   ```
   http://localhost:3000/api/db-test
   ```

   You should see: `{"success": true, "message": "Database connection successful..."}`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Deployment to Vercel

### Initial Setup

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Visit [Vercel](https://vercel.com) and sign in

3. Click "Add New Project" and import your repository

4. Vercel will automatically detect Next.js and configure build settings

5. Click "Deploy"

### Automatic Deployments

Once linked, Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches and pull requests

### Environment Variables

**Required for Production:**

Add Supabase credentials in Vercel Dashboard:

1. Go to Project Settings → Environment Variables

2. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

3. Set these variables for all environments (Production, Preview, Development)

4. Redeploy to apply the changes

**Note:** Never commit `.env.local` to the repository - it's already in `.gitignore`

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (serverless functions)
│   │   └── db-test/      # Database connection test endpoint
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # ShadCN components
│   └── navigation.tsx    # Navigation component
├── lib/                  # Utility functions
│   ├── supabase.ts      # Supabase client configuration
│   └── utils.ts         # Helper utilities
├── .env.local           # Local environment variables (not committed)
├── .env.example         # Environment variables template
└── public/              # Static assets
```

## Contributing

This is an internal tool. For questions or issues, contact the development team.

## License

Proprietary - Internal Use Only
