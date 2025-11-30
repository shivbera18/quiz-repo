import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseJsonField } from '@/lib/database-utils';

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
    const formattedQuizzes = quizzes.map((quiz) => {
      const questions = parseJsonField(quiz.questions);
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount: questions.length,
        timeLimit: quiz.timeLimit,
        difficulty: 'Medium' as const, // TODO: Calculate based on questions
        isCompleted: false, // TODO: Check user results
        bestScore: null, // TODO: Fetch from user results
        attempts: 0, // TODO: Fetch from user results
        lastAttempted: null, // TODO: Fetch from user results
      };
    });

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
