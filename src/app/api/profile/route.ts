import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile - Return the first profile (singleton pattern)
export async function GET() {
  try {
    const profile = await db.profile.findFirst();

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    // Parse JSON fields for client consumption
    const parsed = {
      ...profile,
      extractedSkills: profile.extractedSkills ? JSON.parse(profile.extractedSkills) : [],
      experience: profile.experience ? JSON.parse(profile.experience) : [],
      education: profile.education ? JSON.parse(profile.education) : [],
    };

    return NextResponse.json({ profile: parsed });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST /api/profile - Create or update the profile (singleton)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, name, email, title, summary } = body;

    const existing = await db.profile.findFirst();

    let profile;

    if (existing) {
      profile = await db.profile.update({
        where: { id: existing.id },
        data: {
          ...(resumeText !== undefined && { resumeText }),
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(title !== undefined && { title }),
          ...(summary !== undefined && { summary }),
        },
      });
    } else {
      profile = await db.profile.create({
        data: {
          resumeText: resumeText || null,
          name: name || null,
          email: email || null,
          title: title || null,
          summary: summary || null,
        },
      });
    }

    // Parse JSON fields for client consumption
    const parsed = {
      ...profile,
      extractedSkills: profile.extractedSkills ? JSON.parse(profile.extractedSkills) : [],
      experience: profile.experience ? JSON.parse(profile.experience) : [],
      education: profile.education ? JSON.parse(profile.education) : [],
    };

    return NextResponse.json({ profile: parsed });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
