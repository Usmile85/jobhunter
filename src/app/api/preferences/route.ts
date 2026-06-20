import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/preferences - Return the first JobPreference (singleton)
export async function GET() {
  try {
    const preference = await db.jobPreference.findFirst();

    if (!preference) {
      return NextResponse.json({ preference: null });
    }

    // Parse JSON fields for client consumption
    const parsed = {
      ...preference,
      jobTitles: preference.jobTitles ? JSON.parse(preference.jobTitles) : [],
      locations: preference.locations ? JSON.parse(preference.locations) : [],
      jobTypes: preference.jobTypes ? JSON.parse(preference.jobTypes) : [],
    };

    return NextResponse.json({ preference: parsed });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// POST /api/preferences - Create or update job preferences (singleton)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobTitles, locations, remoteOnly, salaryMin, jobTypes } = body;

    const existing = await db.jobPreference.findFirst();

    const data = {
      ...(jobTitles !== undefined && { jobTitles: JSON.stringify(jobTitles) }),
      ...(locations !== undefined && { locations: JSON.stringify(locations) }),
      ...(remoteOnly !== undefined && { remoteOnly }),
      ...(salaryMin !== undefined && { salaryMin }),
      ...(jobTypes !== undefined && { jobTypes: JSON.stringify(jobTypes) }),
    };

    let preference;

    if (existing) {
      preference = await db.jobPreference.update({
        where: { id: existing.id },
        data,
      });
    } else {
      preference = await db.jobPreference.create({
        data: {
          jobTitles: jobTitles ? JSON.stringify(jobTitles) : '[]',
          locations: locations ? JSON.stringify(locations) : null,
          remoteOnly: remoteOnly ?? false,
          salaryMin: salaryMin ?? null,
          jobTypes: jobTypes ? JSON.stringify(jobTypes) : null,
        },
      });
    }

    // Parse JSON fields for client consumption
    const parsed = {
      ...preference,
      jobTitles: preference.jobTitles ? JSON.parse(preference.jobTitles) : [],
      locations: preference.locations ? JSON.parse(preference.locations) : [],
      jobTypes: preference.jobTypes ? JSON.parse(preference.jobTypes) : [],
    };

    return NextResponse.json({ preference: parsed });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
