"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Edit, Trash2, Upload, ListChecks, Plus } from "lucide-react";

export default function QuizManagementSection({ onEditQuiz }: { onEditQuiz?: (quiz: any) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [editQuizId, setEditQuizId] = useState<string | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState<string>("");
  const [editQuizSubjectId, setEditQuizSubjectId] = useState<string>("");
  const [editQuizChapterId, setEditQuizChapterId] = useState<string>("");
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

  if (loading) return <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">Quiz Management</h2>
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
        <div className="bg-card border-2 border-black dark:border-white/65 rounded-lg shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] p-4">
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (onEditQuiz) {
                        // Compose a quiz object similar to the main admin panel
                        const quizObj = {
                          ...quiz,
                          chapterId: selectedChapterId,
                          subjectId: selectedSubjectId,
                        };
                        onEditQuiz(quizObj);
                      } else {
                        setEditQuizId(quiz.id);
                        setEditQuizTitle(quiz.title);
                        setEditQuizSubjectId(selectedSubjectId);
                        setEditQuizChapterId(selectedChapterId);
                      }
                    }}
                    title="Edit Quiz"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit Quiz
                  </Button>
                  <Button size="sm" variant="secondary" title="Manage Questions" onClick={() => {
                    // Navigate to the dedicated manage questions page for this quiz
                    window.location.href = `/admin/quiz/${quiz.id}`;
                  }}>
                    <ListChecks className="h-4 w-4 mr-1" /> Manage
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


      {/* Edit Quiz Modal (full version) */}
      {editQuizId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Quiz</h2>
              <label className="block mb-2 font-semibold">Title</label>
              <input
                className="border rounded px-3 py-2 w-full mb-4"
                value={editQuizTitle}
                onChange={e => setEditQuizTitle(e.target.value)}
              />
              <label className="block mb-2 font-semibold">Subject</label>
              <Select value={editQuizSubjectId} onValueChange={v => {
                setEditQuizSubjectId(v);
                setEditQuizChapterId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {data.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="block mb-2 font-semibold mt-4">Chapter</label>
              <Select value={editQuizChapterId} onValueChange={setEditQuizChapterId} disabled={!editQuizSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {data.find(s => s.id === editQuizSubjectId)?.chapters.map(chapter => (
                    <SelectItem key={chapter.id} value={chapter.id}>{chapter.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 mt-6">
                <Button variant="secondary" onClick={() => setEditQuizId(null)}>Cancel</Button>
                <Button variant="secondary" onClick={async () => {
                  // Save logic for editing quiz
                  if (!editQuizId) return;
                  const res = await fetch(`/api/admin/quizzes/${editQuizId}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer admin-token-placeholder`, // Replace with real token if available
                    },
                    body: JSON.stringify({
                      title: editQuizTitle,
                      chapterId: editQuizChapterId,
                      // You can add more fields as needed
                    }),
                  });
                  if (res.ok) {
                    // Optionally refresh data
                    setEditQuizId(null);
                    // Refetch quizzes to update UI
                    setLoading(true);
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
                  } else {
                    // Handle error
                    setError("Failed to update quiz");
                  }
                }}>
                  Save
                </Button>
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
                <Button variant="ghost" onClick={() => setManageQuizId(null)}><span className="sr-only">Close</span>✖️</Button>
              </div>
              {questionsLoading ? (
                <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button size="sm" variant="outline" /* onClick for bulk upload here if needed */>
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
    </section>
  );
}
