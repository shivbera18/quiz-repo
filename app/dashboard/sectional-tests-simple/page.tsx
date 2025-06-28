"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calculator, FlaskConical, Globe, Users, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  chapterCount: number;
  quizCount: number;
}

const subjectIcons: { [key: string]: any } = {
  Mathematics: Calculator,
  Physics: Zap,
  Chemistry: FlaskConical,
  Biology: BookOpen,
  'Social Studies': Globe,
  English: Users,
};

export default function SectionalTestsSimplePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      console.log('Fetching subjects...');
      const response = await fetch('/api/subjects');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Subjects data:', data);
        setSubjects(data);
      } else {
        setError(`Failed to load subjects: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Sectional Tests (Simple)</h1>
        <div className="text-center">Loading subjects...</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Sectional Tests (Simple)</h1>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sectional Tests (Simple)</h1>
        <p className="text-gray-600">Choose a subject to practice chapter-wise quizzes</p>
        <p className="text-sm text-blue-600 mt-1">Found {subjects.length} subjects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => {
          const IconComponent = subjectIcons[subject.name] || BookOpen;
          
          return (
            <Link key={subject.id} href={`/dashboard/sectional-tests/${subject.id}`}>
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-200">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: subject.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="group-hover:text-blue-600 transition-colors">
                        {subject.name}
                      </CardTitle>
                      <CardDescription>{subject.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-lg text-blue-600">{subject.chapterCount}</div>
                      <div className="text-gray-600">Chapters</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-lg text-green-600">{subject.quizCount}</div>
                      <div className="text-gray-600">Quizzes</div>
                    </div>
                  </div>
                  <Button className="w-full group-hover:bg-blue-600 transition-colors" variant="outline">
                    Start Practice <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {subjects.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects available</h3>
          <p className="text-gray-600 mb-4">Subjects will appear here once they are added by admin.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      )}
    </div>
  );
}
