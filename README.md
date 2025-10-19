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

## Database Schema

MMDocScan uses Supabase PostgreSQL for data persistence. The database schema supports template management with a three-table normalized structure.

### Tables

#### `templates`

Stores extraction template metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique template identifier |
| `name` | TEXT | NOT NULL | Human-readable template name |
| `template_type` | TEXT | NOT NULL, CHECK constraint | Template type (see allowed values below) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp when template was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated timestamp |

**Allowed `template_type` values:**
- `invoice`
- `estimate`
- `equipment_log`
- `timesheet`
- `consumable_log`
- `generic`

**Indexes:**
- `idx_templates_template_type` on `template_type`

**Triggers:**
- `update_templates_updated_at` - Automatically updates `updated_at` on row changes

#### `template_fields`

Stores field definitions for each template.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique field identifier |
| `template_id` | UUID | NOT NULL, FOREIGN KEY → templates(id) ON DELETE CASCADE | Parent template reference |
| `field_name` | TEXT | NOT NULL | Name of the field to extract |
| `field_type` | TEXT | NOT NULL | Data type: text, number, date, currency |
| `is_header` | BOOLEAN | NOT NULL, DEFAULT false | True if header-level field (vs detail/line-item) |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Order for displaying fields (0-based) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp when field was created |

**Indexes:**
- `idx_template_fields_template_id` on `template_id`
- `idx_template_fields_display_order` on `(template_id, display_order)`

#### `template_prompts`

Stores custom AI prompts for each template.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique prompt identifier |
| `template_id` | UUID | NOT NULL, FOREIGN KEY → templates(id) ON DELETE CASCADE | Parent template reference |
| `prompt_text` | TEXT | NOT NULL | The custom prompt text for AI extraction |
| `prompt_type` | TEXT | NOT NULL | Type/category of prompt (extraction, validation, refinement, custom) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp when prompt was created |

**Indexes:**
- `idx_template_prompts_template_id` on `template_id`
- `idx_template_prompts_prompt_type` on `(template_id, prompt_type)`

### Entity Relationships

```
templates (1) ──< (many) template_fields
templates (1) ──< (many) template_prompts
```

- One template can have many fields
- One template can have many prompts
- CASCADE DELETE: When a template is deleted, all associated fields and prompts are automatically deleted

### Running Migrations

Database migrations are stored in `/migrations` directory. To set up the database schema:

1. Open your Supabase project dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. Navigate to **SQL Editor**

3. Run the consolidated migration script:
   - Open `migrations/000_run_all_migrations.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run"

4. Verify tables were created:
   - Navigate to **Table Editor**
   - You should see: `templates`, `template_fields`, `template_prompts`

### Template CRUD API

The application provides RESTful API endpoints for template management:

**List all templates:**
```bash
GET /api/templates
```

**Create a template:**
```bash
POST /api/templates
Content-Type: application/json

{
  "name": "Invoice Template",
  "template_type": "invoice",
  "fields": [
    {
      "field_name": "Invoice Number",
      "field_type": "text",
      "is_header": true,
      "display_order": 0
    }
  ],
  "prompts": [
    {
      "prompt_text": "Extract invoice data",
      "prompt_type": "extraction"
    }
  ]
}
```

**Get template by ID (with fields and prompts):**
```bash
GET /api/templates/:id
```

**Update a template:**
```bash
PUT /api/templates/:id
Content-Type: application/json

{
  "name": "Updated Invoice Template"
}
```

**Delete a template:**
```bash
DELETE /api/templates/:id
```

**Testing CRUD operations:**
```bash
# Test database connection
curl http://localhost:3000/api/db-test

# Create a template
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Template","template_type":"invoice"}'

# List all templates
curl http://localhost:3000/api/templates
```

## Project Structure

```
/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes (serverless functions)
│   │   ├── db-test/        # Database connection test endpoint
│   │   └── templates/      # Template CRUD API routes
│   │       ├── route.ts    # GET all, POST create
│   │       └── [id]/       # GET one, PUT update, DELETE
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                 # ShadCN components
│   └── navigation.tsx      # Navigation component
├── lib/                    # Utility functions
│   ├── db/                 # Database data access layer
│   │   └── templates.ts    # Template CRUD functions
│   ├── supabase.ts         # Supabase client configuration
│   └── utils.ts            # Helper utilities
├── types/                  # TypeScript type definitions
│   └── template.ts         # Template-related interfaces and enums
├── migrations/             # Database migration SQL scripts
│   ├── 000_run_all_migrations.sql   # Complete schema setup
│   ├── 001_create_templates.sql
│   ├── 002_create_template_fields.sql
│   └── 003_create_template_prompts.sql
├── tests/                  # Test scripts and utilities
│   └── test-templates-api.sh   # CRUD API test script
├── .env.local              # Local environment variables (not committed)
├── .env.example            # Environment variables template
└── public/                 # Static assets
```

## Contributing

This is an internal tool. For questions or issues, contact the development team.

## License

Proprietary - Internal Use Only
