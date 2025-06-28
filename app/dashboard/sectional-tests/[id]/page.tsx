'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, Target, Trophy } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from "@/components/theme-toggle";

interface Chapter {
  id: string;
  name: string;
  description: string;
  quizCount: number;
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: number;
  completedQuizzes: number;
  bestScore: number | null;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function SubjectChaptersPage() {
  const params = useParams();
  const subjectId = params.id as string;
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId) {
      fetchSubjectAndChapters();
    }
  }, [subjectId]);

  const fetchSubjectAndChapters = async () => {
    try {
      const [subjectResponse, chaptersResponse] = await Promise.all([
        fetch(`/api/subjects/${subjectId}`),
        fetch(`/api/subjects/${subjectId}/chapters`)
      ]);

      if (subjectResponse.ok) {
        const subjectData = await subjectResponse.json();
        setSubject(subjectData);
      }

      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        setChapters(chaptersData);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Link 
            href="/dashboard/sectional-tests"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Link>
          <ThemeToggle />
        </div>
        
        <div className="flex items-center space-x-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${subject?.color}20` }}
          >
            <BookOpen 
              className="h-8 w-8" 
              style={{ color: subject?.color }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{subject?.name}</h1>
            <p className="text-gray-600">{subject?.description}</p>
          </div>
        </div>
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chapters.map((chapter) => (
          <Card key={chapter.id} className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{chapter.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {chapter.description}
                  </CardDescription>
                </div>
                <Badge className={getDifficultyColor(chapter.difficulty)}>
                  {chapter.difficulty}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>{chapter.questionCount} Questions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span>{chapter.estimatedTime}min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-purple-500" />
                  <span>{chapter.quizCount} Quiz{chapter.quizCount !== 1 ? 'es' : ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-orange-500" />
                  <span>
                    {chapter.bestScore ? `${chapter.bestScore}%` : 'Not attempted'}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{chapter.completedQuizzes}/{chapter.quizCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${chapter.quizCount > 0 ? (chapter.completedQuizzes / chapter.quizCount) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Button */}
              <Link href={`/dashboard/sectional-tests/${subjectId}/${chapter.id}`}>
                <Button className="w-full">
                  {chapter.completedQuizzes > 0 ? 'Continue Practice' : 'Start Chapter'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {chapters.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters available</h3>
          <p className="text-gray-600 mb-4">Chapters for this subject will appear here once they are added.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      )}
    </div>
  );
}
