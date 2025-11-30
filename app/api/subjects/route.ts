import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: {
            chapters: true,
          }
        },
        chapters: {
          include: {
            _count: {
              select: {
                quizzes: true,
              }
            }
          }
        }
      }
    });

    const formattedSubjects = subjects.map((subject: any) => ({
      id: subject.id,
      name: subject.name,
      description: subject.description || '',
      icon: subject.icon || '',
      color: subject.color || '#3B82F6',
      chapterCount: subject._count.chapters,
      quizCount: subject.chapters.reduce((total: number, chapter: any) => total + chapter._count.quizzes, 0),
      chapters: subject.chapters.map((chapter: any) => ({
        id: chapter.id,
        name: chapter.name,
        description: chapter.description || '',
        subjectId: chapter.subjectId,
        quizCount: chapter._count.quizzes
      }))
    }));

    return NextResponse.json(formattedSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
