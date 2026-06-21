import { aiChatJSON, aiWebSearch } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

interface JobResult {
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  url: string | null;
  source: string | null;
  salary: string | null;
  jobType: string | null;
  postedDate: string | null;
}

// POST /api/jobs/search - Search for jobs using z-ai web search + AI parsing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location, jobType, numResults } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    // Construct search query
    const searchParts = [query];
    if (location) searchParts.push(location);
    if (jobType) searchParts.push(jobType);
    searchParts.push('jobs');

    const searchQuery = searchParts.join(' ');
    const num = numResults || 10;

    // Step 1: Web search
    const searchResults = await aiWebSearch(searchQuery, num);

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    // Step 2: Format search results for AI parsing
    const formattedResults = searchResults.map((r, i) => ({
      index: i + 1,
      title: r.name || '',
      url: r.url || '',
      snippet: r.snippet || '',
      source: r.host_name || '',
    }));

    const resultsText = JSON.stringify(formattedResults, null, 2);

    // Step 3: Use AI to parse into structured job objects
    const systemPrompt = `You are a job listing parser. Given web search results for job searches, extract structured job information.

Return a JSON array of job objects. Each object MUST have these keys:
- title: The job title (e.g. "Data Analyst", "Senior Data Scientist")
- company: The company name (extract from title/snippet, use "Unknown" if not found)
- location: Job location if found, otherwise null
- description: Brief description from the snippet, or null
- url: The job listing URL
- source: The website name (e.g. "linkedin.com", "indeed.com")
- salary: Salary info if mentioned, otherwise null
- jobType: Job type if mentioned (Full-time, Part-time, Contract, Remote), otherwise null
- postedDate: Date if mentioned, otherwise null

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanations.`;

    const userPrompt = `Parse these job search results into structured job listings:\n\n${resultsText}`;

    let jobs: JobResult[];
    try {
      jobs = await aiChatJSON<JobResult[]>(userPrompt, systemPrompt);
    } catch {
      // If AI parsing fails, create basic jobs from search results directly
      jobs = searchResults.map(r => ({
        title: r.name || 'Unknown Position',
        company: 'Unknown',
        location: null,
        description: r.snippet || null,
        url: r.url || null,
        source: r.host_name || null,
        salary: null,
        jobType: null,
        postedDate: null,
      }));
    }

    const finalJobs = Array.isArray(jobs) ? jobs : [];

    return NextResponse.json({ jobs: finalJobs });
  } catch (error) {
    console.error('Error searching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to search for jobs. Please try again.' },
      { status: 500 }
    );
  }
}
