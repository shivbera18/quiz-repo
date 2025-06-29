"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Upload, Edit, Trash2, ListChecks, XCircle } from "lucide-react";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
}
interface Chapter {
  id: string;
  name: string;
  quizzes: Quiz[];
}
interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

function ManageQuizzesPage() {
  const [data, setData] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bulkQuizId, setBulkQuizId] = useState<string | null>(null);
  const [manageQuizId, setManageQuizId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [questionsLoading, setQuestionsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/subjects-chapters-quizzes")
      .then((res) => res.json())
      .then((json) => {
        setData(json.subjects || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;

  // Fetch quiz questions when manageQuizId changes
  useEffect(() => {
    if (manageQuizId) {
      setQuestionsLoading(true);
      fetch(`/api/admin/quizzes/${manageQuizId}`)
        .then(res => res.json())
        .then(json => {
          setQuizQuestions(json.quiz?.questions || []);
          setQuizTitle(json.quiz?.title || "");
          setQuestionsLoading(false);
        })
        .catch(() => setQuestionsLoading(false));
    }
  }, [manageQuizId]);
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Manage Quizzes</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Subject</label>
          <Select value={selectedSubjectId} onValueChange={v => { setSelectedSubjectId(v); setSelectedChapterId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {data.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Chapter</label>
          <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {data.find(s => s.id === selectedSubjectId)?.chapters.map(chapter => (
                <SelectItem key={chapter.id} value={chapter.id}>{chapter.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Quiz List */}
      {selectedSubjectId && selectedChapterId && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-blue-700">Quizzes in {data.find(s => s.id === selectedSubjectId)?.chapters.find(c => c.id === selectedChapterId)?.name}</h2>
          <ul>
            {data.find(s => s.id === selectedSubjectId)?.chapters.find(c => c.id === selectedChapterId)?.quizzes.length === 0 && (
              <li className="text-gray-400 italic py-2">No quizzes in this chapter.</li>
            )}
            {data.find(s => s.id === selectedSubjectId)?.chapters.find(c => c.id === selectedChapterId)?.quizzes.map((quiz) => (
              <li key={quiz.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-blue-400" />
                  <span className="font-semibold text-gray-700">{quiz.title}</span>
                  <span className="ml-2 text-xs text-gray-500">({quiz.questionCount} questions)</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBulkQuizId(quiz.id)} title="Bulk Upload">
                    <Upload className="h-4 w-4 mr-1" /> Bulk Upload
                  </Button>
                  <Button size="sm" variant="secondary" title="Manage Questions" onClick={() => setManageQuizId(quiz.id)}>
                    <Edit className="h-4 w-4 mr-1" /> Manage
                  </Button>
                  <Button size="sm" variant="destructive" title="Delete Quiz">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Bulk Upload Modal (placeholder) */}
      {bulkQuizId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Bulk Upload Questions</h2>
              <p className="mb-4 text-gray-600">Upload questions for this quiz (ID: {bulkQuizId})</p>
              {/* TODO: Add file upload or textarea for bulk input */}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => setBulkQuizId(null)}>Cancel</Button>
                <Button variant="secondary">Upload</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quiz Management Modal */}
      {manageQuizId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Manage Questions: <span className="text-blue-700">{quizTitle}</span></h2>
                <Button variant="ghost" onClick={() => setManageQuizId(null)}><XCircle className="h-6 w-6" /></Button>
              </div>
              {questionsLoading ? (
                <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button size="sm" variant="outline" onClick={() => setBulkQuizId(manageQuizId)}>
                      <Upload className="h-4 w-4 mr-1" /> Bulk Upload
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Plus className="h-4 w-4 mr-1" /> Add Question
                    </Button>
                  </div>
                  <ul className="divide-y">
                    {quizQuestions.length === 0 && (
                      <li className="text-gray-400 italic py-4 text-center">No questions in this quiz.</li>
                    )}
                    {quizQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-center justify-between py-3">
                        <div>
                          <span className="font-semibold text-gray-700 mr-2">Q{idx + 1}.</span>
                          <span className="text-gray-800">{q.question}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" title="Edit"><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ManageQuizzesPage;
