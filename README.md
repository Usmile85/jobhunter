# JobHunter AI

Smart AI-powered job search application for Data Analytics and Data Science professionals. Upload your resume, find matching jobs, generate tailored cover letters, and track your applications — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma)

## Features

- **AI Resume Parser** — Paste your resume and AI automatically extracts skills, experience, and education
- **Smart Job Search** — Search for Data Analytics & Data Science roles across LinkedIn, Indeed, Glassdoor, and more
- **Application Tracker** — Track jobs from Saved → Applied → Interviewing → Offered/Rejected with a visual dashboard
- **AI Cover Letters** — Generate personalized, job-specific cover letters with one click
- **In-App Notifications** — Get alerts when you save jobs or update application statuses
- **Job Preferences** — Configure your ideal job titles, locations, salary, and work type

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM with SQLite
- **AI**: z-ai-web-dev-sdk (resume parsing, job search, cover letter generation)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20+ or Bun 1.3+
- z-ai-web-dev-sdk (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/usmile85/jobhunter-ai.git
cd jobhunter-ai

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Set up the database
bun run db:push

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./db/custom.db` |

## Usage

1. **Resume Tab** — Paste your resume text and click "Parse with AI" to extract your skills and experience
2. **Find Jobs** — Enter keywords (e.g., "data analyst"), location, and job type, then click Search
3. **Save Jobs** — Click the "Save" button on any job listing to add it to your tracker
4. **Applications Tab** — Track saved jobs, update statuses, and generate AI cover letters
5. **Settings** — Configure your job search preferences for better results

## Deploy on Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the `DATABASE_URL` environment variable
4. Click Deploy

> **Note**: For production, consider switching from SQLite to a cloud database like Vercel Postgres or Supabase, as serverless platforms reset the filesystem on each deployment.

## License

MIT
