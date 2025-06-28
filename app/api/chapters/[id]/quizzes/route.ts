import { NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { 
        chapterId: params.id,
        isActive: true 
      },
      orderBy: { createdAt: 'asc' }
    });

    // TODO: Add logic to fetch user's quiz attempts and scores
    const formattedQuizzes = quizzes.map((quiz: any) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
      timeLimit: quiz.timeLimit,
      difficulty: 'Medium' as const, // TODO: Calculate based on questions
      isCompleted: false, // TODO: Check user results
      bestScore: null, // TODO: Fetch from user results
      attempts: 0, // TODO: Fetch from user results
      lastAttempted: null, // TODO: Fetch from user results
    }));

    return NextResponse.json(formattedQuizzes);
  } catch (error) {
    console.error('Error fetching chapter quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter quizzes' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
