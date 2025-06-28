import { NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { subjectId: params.id },
      include: {
        _count: {
          select: {
            questions: true,
            quizzes: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // TODO: Add logic to fetch user's progress for each chapter
    const formattedChapters = chapters.map((chapter: any) => ({
      id: chapter.id,
      name: chapter.name,
      description: chapter.description || '',
      quizCount: chapter._count.quizzes,
      questionCount: chapter._count.questions,
      difficulty: 'Medium' as const, // TODO: Calculate based on questions
      estimatedTime: Math.max(10, chapter._count.questions * 2), // 2 min per question
      completedQuizzes: 0, // TODO: Fetch from user results
      bestScore: null, // TODO: Fetch from user results
    }));

    return NextResponse.json(formattedChapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
