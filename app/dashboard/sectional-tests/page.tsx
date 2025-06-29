"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calculator, FlaskConical, Globe, Users, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

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

export default function SectionalTestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      console.log('🔄 Fetching subjects...');
      const response = await fetch('/api/subjects');
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Subjects loaded:', data.length, 'subjects');
        console.log('📋 Subjects data:', data);
        setSubjects(data);
        setError(null);
      } else {
        const errorText = `API Error: ${response.status} ${response.statusText}`;
        console.error('❌', errorText);
        setError(errorText);
      }
    } catch (error) {
      const errorText = `Network Error: ${error}`;
      console.error('❌', errorText);
      setError(errorText);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sectional Tests</h1>
          <ThemeToggle />
        </div>
        <div className="text-center">🔐 Checking authentication...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sectional Tests</h1>
          <ThemeToggle />
        </div>
        <div className="text-center mb-4">📚 Loading subjects...</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sectional Tests</h1>
          <ThemeToggle />
        </div>
        <div className="text-center text-red-600">
          <h3 className="text-lg font-medium mb-2">❌ Error Loading Subjects</h3>
          <p className="mb-4">{error}</p>
          <Button onClick={fetchSubjects} className="mr-2">
            🔄 Retry
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            🔄 Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
        <Link href="/dashboard" className="block mb-4">
          <Button variant="secondary" className="rounded-full px-4 py-2 flex items-center gap-2 shadow hover:bg-blue-600 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Dashboard</span>
          </Button>
        </Link>
          <h1 className="text-3xl font-bold mb-2">Sectional Tests</h1>
          <p className="text-gray-600">Choose a subject to practice chapter-wise quizzes</p>
          <p className="text-sm text-blue-600 mt-1">
            ✅ Found {subjects.length} subjects • 🔄 API working • 👤 User: {user?.name || 'Guest'}
          </p>
        </div>
        <ThemeToggle />
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
                      {mounted ? (
                        <IconComponent 
                          className="h-6 w-6" 
                          style={{ color: subject.color }}
                        />
                      ) : (
                        <div className="h-6 w-6 bg-gray-300 rounded animate-pulse" />
                      )}
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
                    Start Practice {mounted && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {subjects.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          {mounted ? (
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          ) : (
            <div className="h-12 w-12 bg-gray-300 rounded mx-auto mb-4 animate-pulse" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">📚 No subjects found</h3>
          <p className="text-gray-600 mb-4">
            API is working but returned 0 subjects. Check database or seeding.
          </p>
          <div className="space-y-2 text-sm text-gray-500 mb-4">
            <p>• API Status: ✅ Accessible</p>
            <p>• Auth Status: {user ? '✅ Authenticated' : '❌ Not authenticated'}</p>
            <p>• Loading: {loading ? '🔄 Loading' : '✅ Complete'}</p>
            <p>• Error: {error || '✅ None'}</p>
          </div>
          <Button variant="outline" onClick={fetchSubjects} className="mr-2">
            🔄 Retry API Call
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            🔄 Refresh Page
          </Button>
        </div>
      )}
    </div>
  );
}
