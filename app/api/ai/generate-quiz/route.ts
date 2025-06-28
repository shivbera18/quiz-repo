// AI Complete Quiz Generator API Route
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@/lib/generated/prisma"
import { stringifyForDatabase } from "@/lib/database-utils"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      topic,
      subjectId,
      chapterId,
      sections,
      difficulty,
      questionsPerSection,
      duration,
      negativeMarking,
      negativeMarkValue
    } = await request.json()

    // Validate required fields
    if (!title || !topic || !sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title, topic, sections' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Authorization check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const allQuestions: any[] = []
    
    // Generate questions for each section
    for (const section of sections) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
        const prompt = `Generate ${questionsPerSection} ${difficulty} level multiple choice questions for the "${section}" section about "${topic}".

Requirements:
- Each question should have exactly 4 options
- Only one correct answer per question
- Include a clear explanation for the correct answer
- Add relevant tags for categorization
- Make questions challenging but fair for ${difficulty} level
- Ensure variety in question types and concepts
- Questions should be relevant to ${section} section and ${topic}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this is correct",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Topic: ${topic}
Section: ${section}
Difficulty: ${difficulty}
Number of questions: ${questionsPerSection}`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        // Extract JSON from the response
        let jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error(`No valid JSON found in AI response for section ${section}`)
        }
        
        const aiData = JSON.parse(jsonMatch[0])
        
        if (!aiData.questions || !Array.isArray(aiData.questions)) {
          throw new Error(`Invalid AI response format for section ${section}`)
        }
        
        // Transform AI questions to our format
        const sectionQuestions = aiData.questions.map((q: any, index: number) => ({
          id: `${Date.now()}-${section}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          section,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || "",
          tags: Array.isArray(q.tags) ? q.tags : [],
          createdAt: new Date().toISOString()
        }))
        
        allQuestions.push(...sectionQuestions)
        
      } catch (sectionError) {
        console.error(`Error generating questions for section ${section}:`, sectionError)
        return NextResponse.json(
          { error: `Failed to generate questions for section: ${section}` },
          { status: 500 }
        )
      }
    }

    // Create the quiz in the database
    try {
      const createdQuiz = await prisma.quiz.create({
        data: {
          title,
          description: description || `AI-generated quiz on ${topic}`,
          timeLimit: duration || 60,
          sections: stringifyForDatabase(sections),
          questions: stringifyForDatabase(allQuestions),
          isActive: true,
          createdBy: "admin",
          negativeMarking: negativeMarking ?? true,
          negativeMarkValue: negativeMarkValue ?? 0.25,
          chapterId: chapterId || null,
          // Remove createdAt - it's handled automatically by Prisma @default(now())
        },
      })

      // Update questions with the quiz ID
      const updatedQuestions = allQuestions.map(q => ({
        ...q,
        quizId: createdQuiz.id
      }))

      // Update the quiz with the correct question IDs
      await prisma.quiz.update({
        where: { id: createdQuiz.id },
        data: {
          questions: stringifyForDatabase(updatedQuestions)
        }
      })

      const responseQuiz = {
        id: createdQuiz.id,
        title: createdQuiz.title,
        description: createdQuiz.description,
        duration: createdQuiz.timeLimit,
        sections: sections,
        questions: updatedQuestions,
        isActive: createdQuiz.isActive,
        createdAt: createdQuiz.createdAt.toISOString(),
        createdBy: createdQuiz.createdBy,
        negativeMarking: createdQuiz.negativeMarking,
        negativeMarkValue: createdQuiz.negativeMarkValue,
      }

      return NextResponse.json({
        success: true,
        quiz: responseQuiz,
        message: `Successfully created quiz with ${allQuestions.length} questions across ${sections.length} sections`
      })

    } catch (dbError) {
      console.error('Database error creating quiz:', dbError)
      
      // Type-safe error handling
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      const errorCode = (dbError as any)?.code
      
      console.error("Database error details:", {
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        message: errorMessage,
        code: errorCode
      })
      
      // Provide more specific error messages
      if (errorCode === 'P2002') {
        return NextResponse.json(
          { error: 'Quiz with this title already exists' },
          { status: 400 }
        )
      }
      
      if (errorCode === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid chapter ID provided' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create quiz in database', details: errorMessage },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('AI Quiz Generation Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate AI quiz',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
