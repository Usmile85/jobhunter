import { db } from '@/lib/db';
import { aiChatJSON } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

interface ParsedResume {
  name: string | null;
  email: string | null;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience: Array<{ title: string; company: string; duration: string }>;
  education: Array<{ degree: string; school: string; year: string }>;
}

// POST /api/profile/parse - Parse resume text using z-ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText } = body;

    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json(
        { error: 'resumeText is required' },
        { status: 400 }
      );
    }

    const systemPrompt =
      'You are an expert resume parser. Extract structured data from the resume text. Return ONLY valid JSON with keys: name, email, title, summary, skills (string array), experience (array of objects with title/company/duration), education (array of objects with degree/school/year). If you cannot find a field, use null.';

    const userPrompt = `Parse the following resume and extract structured information:\n\n${resumeText}`;

    const parsed = await aiChatJSON<ParsedResume>(userPrompt, systemPrompt);

    // Save extracted data to Profile table
    const existing = await db.profile.findFirst();

    const profileData = {
      resumeText,
      name: parsed.name || null,
      email: parsed.email || null,
      title: parsed.title || null,
      summary: parsed.summary || null,
      extractedSkills: parsed.skills ? JSON.stringify(parsed.skills) : '[]',
      experience: parsed.experience ? JSON.stringify(parsed.experience) : '[]',
      education: parsed.education ? JSON.stringify(parsed.education) : '[]',
    };

    let profile;
    if (existing) {
      profile = await db.profile.update({
        where: { id: existing.id },
        data: profileData,
      });
    } else {
      profile = await db.profile.create({
        data: profileData,
      });
    }

    // Return parsed result with JSON fields decoded
    const result = {
      ...profile,
      extractedSkills: profile.extractedSkills ? JSON.parse(profile.extractedSkills) : [],
      experience: profile.experience ? JSON.parse(profile.experience) : [],
      education: profile.education ? JSON.parse(profile.education) : [],
    };

    return NextResponse.json({ profile: result, parsed });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json(
      { error: 'Failed to parse resume. Please try again.' },
      { status: 500 }
    );
  }
}
