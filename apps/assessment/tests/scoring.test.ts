import { describe, expect, it } from "vitest"
import { scoreQuiz, type ScoringAnswer, type ScoringQuestion } from "../src/lib/scoring.js"

// Golden fixtures: these encode the exact behavior of the client-side scoring logic
// that used to live in app/quiz/[id]/page.tsx handleSubmit(), before it was extracted
// into lib/scoring.ts (and, with the service split, into this copy). Server-side
// scoring (POST /v1/attempts/:id/submit, via attempt-service.ts) must reproduce every
// one of these numbers exactly, including negative marking and the totalScore-floors-at-0
// behavior.

function q(id: string, section: string, correctAnswer: number, extra: Partial<ScoringQuestion> = {}): ScoringQuestion {
  return { id, section, correctAnswer, ...extra }
}

function a(questionId: string, selectedAnswer: number | null | undefined): ScoringAnswer {
  return { questionId, selectedAnswer }
}

describe("scoreQuiz - single question scenarios", () => {
  const cases: Array<{
    name: string
    question: ScoringQuestion
    answers: ScoringAnswer[]
    negativeMarking: boolean
    negativeMarkValue: number
    expected: { correctAnswers: number; wrongAnswers: number; unanswered: number; rawScore: number; totalScore: number }
  }> = [
    {
      name: "correct answer, negative marking on",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 1)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 1, wrongAnswers: 0, unanswered: 0, rawScore: 1, totalScore: 100 },
    },
    {
      name: "correct answer, negative marking off",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 1)],
      negativeMarking: false,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 1, wrongAnswers: 0, unanswered: 0, rawScore: 1, totalScore: 100 },
    },
    {
      name: "wrong answer, negative marking on (0.25)",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 2)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: -0.25, totalScore: 0 },
    },
    {
      name: "wrong answer, negative marking on (1.0)",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 2)],
      negativeMarking: true,
      negativeMarkValue: 1,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: -1, totalScore: 0 },
    },
    {
      name: "wrong answer, negative marking off",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 2)],
      negativeMarking: false,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: 0, totalScore: 0 },
    },
    {
      name: "unanswered (selectedAnswer null)",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", null)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 0, unanswered: 1, rawScore: 0, totalScore: 0 },
    },
    {
      name: "unanswered (selectedAnswer undefined)",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", undefined)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 0, unanswered: 1, rawScore: 0, totalScore: 0 },
    },
    {
      name: "unanswered (no answer object at all)",
      question: q("q1", "reasoning", 1),
      answers: [],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 0, unanswered: 1, rawScore: 0, totalScore: 0 },
    },
    {
      name: "selected answer 0 counts as answered, correct",
      question: q("q1", "reasoning", 0),
      answers: [a("q1", 0)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 1, wrongAnswers: 0, unanswered: 0, rawScore: 1, totalScore: 100 },
    },
    {
      name: "selected answer 0 counts as answered, wrong",
      question: q("q1", "reasoning", 2),
      answers: [a("q1", 0)],
      negativeMarking: true,
      negativeMarkValue: 0.25,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: -0.25, totalScore: 0 },
    },
    {
      name: "negativeMarkValue 0 behaves like negative marking off",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 2)],
      negativeMarking: true,
      negativeMarkValue: 0,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: 0, totalScore: 0 },
    },
    {
      name: "negativeMarkValue 0.33",
      question: q("q1", "reasoning", 1),
      answers: [a("q1", 2)],
      negativeMarking: true,
      negativeMarkValue: 0.33,
      expected: { correctAnswers: 0, wrongAnswers: 1, unanswered: 0, rawScore: -0.33, totalScore: 0 },
    },
  ]

  it.each(cases)("$name", ({ question, answers, negativeMarking, negativeMarkValue, expected }) => {
    const result = scoreQuiz([question], answers, { negativeMarking, negativeMarkValue })
    expect(result.correctAnswers).toBe(expected.correctAnswers)
    expect(result.wrongAnswers).toBe(expected.wrongAnswers)
    expect(result.unanswered).toBe(expected.unanswered)
    expect(result.rawScore).toBeCloseTo(expected.rawScore, 10)
    expect(result.totalScore).toBeCloseTo(expected.totalScore, 10)
  })
})

describe("scoreQuiz - multi-question aggregate scenarios", () => {
  const fourQuestions: ScoringQuestion[] = [
    q("q1", "reasoning", 1),
    q("q2", "reasoning", 0),
    q("q3", "quantitative", 2),
    q("q4", "quantitative", 3),
  ]

  it("all four correct -> totalScore 100, rawScore 4", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 1), a("q2", 0), a("q3", 2), a("q4", 3)],
      { negativeMarking: true, negativeMarkValue: 0.25 }
    )
    expect(result.correctAnswers).toBe(4)
    expect(result.wrongAnswers).toBe(0)
    expect(result.unanswered).toBe(0)
    expect(result.rawScore).toBe(4)
    expect(result.totalScore).toBe(100)
  })

  it("all four wrong, negative marking on -> rawScore -1, totalScore floors at 0", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 0), a("q2", 1), a("q3", 3), a("q4", 2)],
      { negativeMarking: true, negativeMarkValue: 0.25 }
    )
    expect(result.correctAnswers).toBe(0)
    expect(result.wrongAnswers).toBe(4)
    expect(result.rawScore).toBeCloseTo(-1, 10)
    expect(result.totalScore).toBe(0)
  })

  it("all four unanswered -> everything zero", () => {
    const result = scoreQuiz(fourQuestions, [], { negativeMarking: true, negativeMarkValue: 0.25 })
    expect(result.correctAnswers).toBe(0)
    expect(result.wrongAnswers).toBe(0)
    expect(result.unanswered).toBe(4)
    expect(result.rawScore).toBe(0)
    expect(result.totalScore).toBe(0)
  })

  it("2 correct, 1 wrong, 1 unanswered, negative marking on", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 1), a("q2", 0), a("q3", 1) /* wrong */],
      { negativeMarking: true, negativeMarkValue: 0.25 }
    )
    expect(result.correctAnswers).toBe(2)
    expect(result.wrongAnswers).toBe(1)
    expect(result.unanswered).toBe(1)
    expect(result.rawScore).toBeCloseTo(2 - 0.25, 10)
    expect(result.totalScore).toBeCloseTo(((2 - 0.25) / 4) * 100, 10)
  })

  it("2 correct, 1 wrong, 1 unanswered, negative marking off", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 1), a("q2", 0), a("q3", 1) /* wrong */],
      { negativeMarking: false, negativeMarkValue: 0.25 }
    )
    expect(result.rawScore).toBe(2)
    expect(result.totalScore).toBe(50)
  })

  it("section percentages computed against total-in-section, not just answered", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 1) /* reasoning correct */, a("q3", 2) /* quantitative correct */],
      { negativeMarking: true, negativeMarkValue: 0.25 }
    )
    // reasoning: 1 correct out of 2 total -> 50%
    expect(result.sectionPercentages.reasoning).toBeCloseTo(50, 10)
    // quantitative: 1 correct out of 2 total -> 50%
    expect(result.sectionPercentages.quantitative).toBeCloseTo(50, 10)
  })

  it("section with zero correct -> 0%", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 0) /* reasoning wrong */, a("q2", 1) /* reasoning wrong */],
      { negativeMarking: false, negativeMarkValue: 0.25 }
    )
    expect(result.sectionPercentages.reasoning).toBe(0)
  })

  it("section with all correct -> 100%", () => {
    const result = scoreQuiz(
      fourQuestions,
      [a("q1", 1), a("q2", 0)],
      { negativeMarking: false, negativeMarkValue: 0.25 }
    )
    expect(result.sectionPercentages.reasoning).toBe(100)
  })

  it("three sections aggregate independently", () => {
    const threeSection: ScoringQuestion[] = [
      q("q1", "reasoning", 1),
      q("q2", "quantitative", 0),
      q("q3", "english", 2),
    ]
    const result = scoreQuiz(
      threeSection,
      [a("q1", 1), a("q2", 1) /* wrong */, a("q3", 2)],
      { negativeMarking: true, negativeMarkValue: 0.25 }
    )
    expect(result.sectionPercentages.reasoning).toBe(100)
    expect(result.sectionPercentages.quantitative).toBe(0)
    expect(result.sectionPercentages.english).toBe(100)
    expect(result.correctAnswers).toBe(2)
    expect(result.wrongAnswers).toBe(1)
    expect(result.rawScore).toBeCloseTo(2 - 0.25, 10)
  })

  it("single-question quiz, wrong with heavy negative marking floors totalScore at 0 not negative", () => {
    const result = scoreQuiz([q("q1", "reasoning", 1)], [a("q1", 0)], {
      negativeMarking: true,
      negativeMarkValue: 5,
    })
    expect(result.rawScore).toBe(-5)
    expect(result.totalScore).toBe(0)
  })
})

describe("scoreQuiz - per-question result fidelity", () => {
  it("carries question metadata (text, options, explanation, image) into the result", () => {
    const question = q("q1", "reasoning", 1, {
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      explanation: "Basic arithmetic",
      image: "data:image/png;base64,abc",
    })
    const result = scoreQuiz([question], [a("q1", 1)], { negativeMarking: true, negativeMarkValue: 0.25 })
    const [qr] = result.questionResults
    expect(qr.question).toBe("What is 2+2?")
    expect(qr.options).toEqual(["3", "4", "5", "6"])
    expect(qr.explanation).toBe("Basic arithmetic")
    expect(qr.image).toBe("data:image/png;base64,abc")
    expect(qr.correctAnswer).toBe(1)
    expect(qr.selectedAnswer).toBe(1)
    expect(qr.isCorrect).toBe(true)
    expect(qr.isUnanswered).toBe(false)
  })

  it("selectedAnswer is null (not undefined) in the result when unanswered", () => {
    const result = scoreQuiz([q("q1", "reasoning", 1)], [], { negativeMarking: true, negativeMarkValue: 0.25 })
    const [qr] = result.questionResults
    expect(qr.selectedAnswer).toBeNull()
    expect(qr.isUnanswered).toBe(true)
    expect(qr.isCorrect).toBe(false)
  })

  it("passes through questionTimes per question, defaulting to 0 when missing", () => {
    const questions = [q("q1", "reasoning", 1), q("q2", "reasoning", 0)]
    const result = scoreQuiz(questions, [a("q1", 1), a("q2", 0)], {
      negativeMarking: true,
      negativeMarkValue: 0.25,
      questionTimes: { q1: 4200 },
    })
    expect(result.questionResults.find((r) => r.questionId === "q1")?.timeSpent).toBe(4200)
    expect(result.questionResults.find((r) => r.questionId === "q2")?.timeSpent).toBe(0)
  })

  it("preserves question order in questionResults", () => {
    const questions = [q("qA", "s", 0), q("qB", "s", 0), q("qC", "s", 0)]
    const result = scoreQuiz(questions, [], { negativeMarking: false, negativeMarkValue: 0 })
    expect(result.questionResults.map((r) => r.questionId)).toEqual(["qA", "qB", "qC"])
  })
})
