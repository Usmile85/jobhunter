import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/jobs/saved/[id] - Update a saved job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, coverLetter, appliedDate } = body;

    // Check if job exists
    const existing = await db.savedJob.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Saved job not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (coverLetter !== undefined) updateData.coverLetter = coverLetter;
    if (appliedDate !== undefined) updateData.appliedDate = appliedDate ? new Date(appliedDate) : null;

    const updated = await db.savedJob.update({
      where: { id },
      data: updateData,
    });

    // Create notification for status changes
    if (status && status !== existing.status) {
      const statusMessages: Record<string, string> = {
        applied: 'Application submitted',
        interviewing: 'Interview stage reached',
        offered: 'Offer received!',
        rejected: 'Application not selected',
        saved: 'Job moved back to saved',
      };

      await db.notification.create({
        data: {
          title: statusMessages[status] || 'Job Status Updated',
          message: `"${existing.title}" at ${existing.company} status changed to ${status}`,
          type: status === 'offered' ? 'alert' : status === 'rejected' ? 'info' : 'application',
          jobId: id,
        },
      });
    }

    return NextResponse.json({ savedJob: updated });
  } catch (error) {
    console.error('Error updating saved job:', error);
    return NextResponse.json(
      { error: 'Failed to update saved job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/saved/[id] - Remove a saved job
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.savedJob.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Saved job not found' },
        { status: 404 }
      );
    }

    await db.savedJob.delete({ where: { id } });

    return NextResponse.json({ message: 'Job removed successfully' });
  } catch (error) {
    console.error('Error deleting saved job:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved job' },
      { status: 500 }
    );
  }
}
