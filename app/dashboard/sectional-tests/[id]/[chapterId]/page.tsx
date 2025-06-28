'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Target, CheckCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from "@/components/theme-toggle";

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  timeLimit: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isCompleted: boolean;
  bestScore: number | null;
  attempts: number;
  lastAttempted: string | null;
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
        
        <Link 
          href={`/dashboard/sectional-tests/${subjectId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chapters
        </Link>
        
        <h1 className="text-3xl font-bold">{chapter?.name} - Practice Quizzes</h1>
        <p className="text-gray-600 mt-2">Master this chapter with targeted practice quizzes</p>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {quizzes.map((quiz, index) => (
          <Card key={quiz.id} className="hover:shadow-md transition-shadow border-2 hover:border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold">{quiz.title}</h3>
                    <Badge className={getDifficultyColor(quiz.difficulty)}>
                      {quiz.difficulty}
                    </Badge>
                    {quiz.isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3">{quiz.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{quiz.questionCount} questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.timeLimit} minutes</span>
                    </div>
                    {quiz.attempts > 0 && (
                      <div className="flex items-center space-x-1">
                        <span>Attempts: {quiz.attempts}</span>
                      </div>
                    )}
                    {quiz.bestScore !== null && (
                      <div className="flex items-center space-x-1">
                        <span>Best: {quiz.bestScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-6">
                  <Link href={`/quiz/${quiz.id}`}>
                    <Button className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <span>{quiz.isCompleted ? 'Retake' : 'Start Quiz'}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
