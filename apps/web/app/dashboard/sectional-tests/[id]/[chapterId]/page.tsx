'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Target, CheckCircle, Play, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from "@/components/theme-toggle";

type SchedulingStatus = "available" | "upcoming" | "closed"
interface Quiz {
  id: string
  title: string
  description: string
  questionCount: number
  timeLimit: number
  startTime?: string | null
  endTime?: string | null
  schedulingStatus?: SchedulingStatus
}

interface ChapterInfo {
  id: string;
  name: string;
  subject: {
    id: string;
    name: string;
    color: string;
  };
}

export default function ChapterQuizzesPage() {
  const params = useParams();
  const subjectId = params.id as string;
  const chapterId = params.chapterId as string;
  
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId && chapterId) {
      fetchChapterAndQuizzes();
    }
  }, [subjectId, chapterId]);

  const fetchChapterAndQuizzes = async () => {
    try {
      const [chapterResponse, quizzesResponse] = await Promise.all([
        fetch(`/api/chapters/${chapterId}`),
        fetch(`/api/chapters/${chapterId}/quizzes`)
      ]);

      if (chapterResponse.ok) {
        const chapterData = await chapterResponse.json();
        setChapter(chapterData);
      }

      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        setQuizzes(quizzesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <nav className="flex space-x-2 text-sm text-gray-500">
            <Link href="/dashboard/sectional-tests" className="hover:text-blue-600">
              Sectional Tests
            </Link>
            <span>/</span>
            <Link 
              href={`/dashboard/sectional-tests/${subjectId}`}
              className="hover:text-blue-600"
            >
              {chapter?.subject.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{chapter?.name}</span>
          </nav>
          <ThemeToggle />
        </div>
        
        <Link href={`/dashboard/sectional-tests/${subjectId}`} className="block mb-4">
          <Button variant="secondary" className="rounded-full px-4 py-2 flex items-center gap-2 shadow hover:bg-blue-600 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Chapters</span>
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold">{chapter?.name} - Practice Quizzes</h1>
        <p className="text-gray-600 mt-2">Master this chapter with targeted practice quizzes</p>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {quizzes.map((quiz, index) => {
          const now = Date.now()
          let status: SchedulingStatus = quiz.schedulingStatus ?? "available"
          if (!quiz.schedulingStatus) {
            if (quiz.endTime && !Number.isNaN(Date.parse(quiz.endTime)) && now > Date.parse(quiz.endTime)) status = "closed"
            else if (quiz.startTime && !Number.isNaN(Date.parse(quiz.startTime)) && now < Date.parse(quiz.startTime)) status = "upcoming"
          }
          const isLocked = status !== "available"
          const scheduleLabel = status === "upcoming" && quiz.startTime ? `Opens ${new Date(quiz.startTime).toLocaleString()}` : status === "closed" ? "Closed" : quiz.endTime ? `Closes ${new Date(quiz.endTime).toLocaleString()}` : null
          return (
          <Card key={quiz.id} className="hover:shadow-md transition-shadow border-2 hover:border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold break-words">{quiz.title}</h3>
                    {status !== "available" && (
                      <Badge className={`text-xs font-bold border-2 border-black ${status === "upcoming" ? "bg-blue-300 text-black" : "bg-red-300 text-black"}`}>{status === "upcoming" ? "Upcoming" : "Closed"}</Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3 break-words">{quiz.description}</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{quiz.questionCount} questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.timeLimit} minutes</span>
                    </div>
                    {scheduleLabel && (
                      <div className="flex items-center space-x-1">
                        <CalendarClock className="h-4 w-4" />
                        <span>{scheduleLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="sm:ml-6 w-full sm:w-auto">
                  {isLocked ? (
                    <Button className="flex items-center justify-center w-full sm:w-auto space-x-2 mt-4 sm:mt-0 opacity-60 cursor-not-allowed" disabled>
                      <span>{status === "upcoming" ? "Not yet open" : "Closed"}</span>
                    </Button>
                  ) : (
                    <Link href={`/quiz/${quiz.id}?fromSubject=${subjectId}&fromChapter=${chapterId}`} className="block w-full">
                      <Button className="flex items-center justify-center w-full sm:w-auto space-x-2 mt-4 sm:mt-0">
                        <Play className="h-4 w-4" />
                        <span>Start Quiz</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      {quizzes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes available</h3>
          <p className="text-gray-600 mb-4">Practice quizzes for this chapter will appear here once they are created.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      )}
    </div>
  );
}
