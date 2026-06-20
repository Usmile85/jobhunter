import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/jobs/saved - Return all saved jobs, sorted by createdAt desc
export async function GET() {
  try {
    const savedJobs = await db.savedJob.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ savedJobs });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs/saved - Save a new job and create a notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      company,
      location,
      description,
      url,
      source,
      salary,
      jobType,
      matchScore,
      postedDate,
    } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: 'title and company are required' },
        { status: 400 }
      );
    }

    const savedJob = await db.savedJob.create({
      data: {
        title,
        company,
        location: location || null,
        description: description || null,
        url: url || null,
        source: source || null,
        salary: salary || null,
        jobType: jobType || null,
        matchScore: matchScore ?? null,
        postedDate: postedDate || null,
      },
    });

    // Create a notification for the newly saved job
    await db.notification.create({
      data: {
        title: 'Job Saved',
        message: `You saved "${title}" at ${company}${location ? ` in ${location}` : ''}`,
        type: 'match',
        jobId: savedJob.id,
      },
    });

    return NextResponse.json({ savedJob }, { status: 201 });
  } catch (error) {
    console.error('Error saving job:', error);
    return NextResponse.json(
      { error: 'Failed to save job' },
      { status: 500 }
    );
  }
}
