import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma-client";

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            quizzes: true
          }
        }
      }
    });
    // Format for frontend
    const formatted = subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      chapters: subject.chapters.map(chapter => ({
        id: chapter.id,
        name: chapter.name,
        quizzes: chapter.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title,
          questionCount: (() => {
            try {
              const arr = JSON.parse(quiz.questions);
              return Array.isArray(arr) ? arr.length : 0;
            } catch {
              return 0;
            }
          })()
        }))
      }))
    }));
    return NextResponse.json({ subjects: formatted });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
