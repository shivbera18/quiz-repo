import { Router } from "express"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "../db.js"

const router = Router()

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

router.post("/generate-questions", async (req, res) => {
  try {
    const { section, count, difficulty, chapterId } = req.body

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Generate ${count || 5} ${difficulty || "medium"} difficulty multiple choice questions for the ${section} section. 
    Return a JSON array with objects containing: question, options (array of 4), correctAnswer (index 0-3), explanation, difficulty, tags.`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    let questions = []
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      questions = []
    }

    if (chapterId) {
      for (const q of questions) {
        await prisma.questionBankItem.create({
          data: {
            section,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
            difficulty: q.difficulty || "medium",
            tags: JSON.stringify(q.tags || []),
            chapterId,
          },
        })
      }
    }

    res.json({ questions })
  } catch (error) {
    console.error("Generate questions error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/generate-quiz", async (req, res) => {
  try {
    const { subjectId, chapterId, section, count, difficulty, timeLimit } = req.body

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Generate a quiz with ${count || 10} ${difficulty || "medium"} difficulty multiple choice questions.
    Topics: ${section || "general"}
    Return a JSON object with: title, description, timeLimit, sections (array), questions (array with question, options, correctAnswer, explanation).`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    let quizData = null
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
    }

    if (quizData) {
      const newQuiz = await prisma.quiz.create({
        data: {
          title: quizData.title || "AI Generated Quiz",
          description: quizData.description || "",
          timeLimit: timeLimit || 30,
          sections: JSON.stringify(quizData.sections || [section || "general"]),
          questions: JSON.stringify(quizData.questions || []),
          createdBy: "AI",
          chapterId,
        },
      })

      return res.json(newQuiz)
    }

    res.status(500).json({ message: "Failed to generate quiz" })
  } catch (error) {
    console.error("Generate quiz error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { topics, count } = req.body

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Generate ${count || 10} flashcards for topics: ${topics?.join(", ") || "general knowledge"}.
    Return a JSON array with objects containing: front, back, topic.`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    let flashcards = []
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
    }

    res.json({ flashcards })
  } catch (error) {
    console.error("Generate flashcards error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router