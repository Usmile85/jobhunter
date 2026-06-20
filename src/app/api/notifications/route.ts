import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications - Return all notifications sorted by createdAt desc
export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      await db.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id or markAll is required' },
        { status: 400 }
      );
    }

    // Mark a single notification as read
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = await db.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
