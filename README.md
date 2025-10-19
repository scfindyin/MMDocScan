# MMDocScan

AI-Powered Document Data Extraction Tool

## Overview

MMDocScan is a Next.js application that enables users to create document templates and extract structured data from documents using AI-powered OCR and natural language processing.

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript 5.3+
- **Styling:** Tailwind CSS 3.4+
- **UI Components:** ShadCN (Radix UI + Tailwind)
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

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

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

If needed, add environment variables in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add variables for development, preview, and production

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # ShadCN components
│   └── navigation.tsx    # Navigation component
├── lib/                  # Utility functions
│   └── utils.ts         # Helper utilities
└── public/              # Static assets
```

## Contributing

This is an internal tool. For questions or issues, contact the development team.

## License

Proprietary - Internal Use Only
