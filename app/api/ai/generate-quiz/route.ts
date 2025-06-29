// AI Complete Quiz Generator API Route
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { prisma, VercelPrismaClient } from "@/lib/prisma-client"
import { stringifyForDatabase } from "@/lib/database-utils"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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

    // Validate required fields with detailed error messages
    const validationErrors = []

    if (!title) {
      validationErrors.push({
        field: "title",
        message: "Quiz title is required",
        errorType: "VALIDATION_ERROR"
      })
    } else if (typeof title !== 'string' || title.trim().length < 3) {
      validationErrors.push({
        field: "title",
        message: "Quiz title must be at least 3 characters long",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (!topic) {
      validationErrors.push({
        field: "topic",
        message: "Topic/subject matter is required for AI quiz generation",
        errorType: "VALIDATION_ERROR"
      })
    } else if (typeof topic !== 'string' || topic.trim().length < 5) {
      validationErrors.push({
        field: "topic",
        message: "Topic must be at least 5 characters long to generate meaningful questions",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      validationErrors.push({
        field: "sections",
        message: "At least one section is required (e.g., Quantitative, Reasoning, English)",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (!questionsPerSection || questionsPerSection < 1) {
      validationErrors.push({
        field: "questionsPerSection",
        message: "Questions per section must be at least 1",
        errorType: "VALIDATION_ERROR"
      })
    } else if (questionsPerSection > 50) {
      validationErrors.push({
        field: "questionsPerSection",
        message: "Questions per section cannot exceed 50 (to avoid API limits)",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (!duration || duration < 5) {
      validationErrors.push({
        field: "duration",
        message: "Quiz duration must be at least 5 minutes",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (!chapterId || (typeof chapterId === 'string' && chapterId.trim() === '')) {
      validationErrors.push({
        field: "chapterId",
        message: "Chapter selection is required for proper quiz organization",
        errorType: "VALIDATION_ERROR"
      })
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        message: "Validation failed",
        errors: validationErrors,
        errorType: "VALIDATION_ERROR",
        totalErrors: validationErrors.length
      }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        message: "AI service configuration error",
        error: 'Gemini API key not configured on server',
        errorType: "CONFIG_ERROR"
      }, { status: 500 })
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
        
        const errorMessage = sectionError instanceof Error ? sectionError.message : String(sectionError)
        
        // Specific AI service error handling
        if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
          return NextResponse.json({
            message: "AI service authentication error",
            error: "Invalid or expired API key for AI service",
            errorType: "AI_AUTH_ERROR",
            section: section
          }, { status: 401 })
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
          return NextResponse.json({
            message: "AI service quota exceeded",
            error: "API rate limit or quota exceeded. Please try again later.",
            errorType: "AI_QUOTA_ERROR",
            section: section
          }, { status: 429 })
        }
        
        if (errorMessage.includes('JSON')) {
          return NextResponse.json({
            message: "AI response format error",
            error: `AI service returned invalid response format for section: ${section}`,
            errorType: "AI_FORMAT_ERROR",
            section: section
          }, { status: 500 })
        }
        
        if (errorMessage.includes('No valid JSON')) {
          return NextResponse.json({
            message: "AI response parsing error",
            error: `Unable to extract valid questions from AI response for section: ${section}`,
            errorType: "AI_PARSE_ERROR",
            section: section
          }, { status: 500 })
        }
        
        return NextResponse.json({
          message: "AI question generation failed",
          error: `Failed to generate questions for section: ${section}`,
          errorType: "AI_GENERATION_ERROR",
          section: section,
          details: errorMessage
        }, { status: 500 })
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
      console.error('Database error creating AI quiz:', dbError)
      
      // Type-safe error handling
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      const errorCode = (dbError as any)?.code
      
      console.error("AI Quiz database error details:", {
        name: dbError instanceof Error ? dbError.name : 'Unknown',
        message: errorMessage,
        code: errorCode
      })
      
      // Handle specific Prisma errors for AI quiz creation
      if (errorCode === 'P2002') {
        const targetField = (dbError as any)?.meta?.target?.[0] || 'field'
        return NextResponse.json({
          message: "Duplicate AI quiz error",
          error: `An AI quiz with this ${targetField} already exists`,
          errorType: "AI_DUPLICATE_ERROR",
          field: targetField
        }, { status: 400 })
      }
      
      if (errorCode === 'P2003') {
        const targetField = (dbError as any)?.meta?.field_name || 'chapterId'
        return NextResponse.json({
          message: "Invalid AI quiz reference",
          error: `The ${targetField} provided for AI quiz does not exist`,
          errorType: "AI_FOREIGN_KEY_ERROR",
          field: targetField
        }, { status: 400 })
      }

      if (errorCode === 'P2025') {
        return NextResponse.json({
          message: "AI quiz record not found",
          error: "Referenced record for AI quiz creation does not exist",
          errorType: "AI_RECORD_NOT_FOUND"
        }, { status: 404 })
      }

      // Handle connection errors
      if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
        return NextResponse.json({
          message: "AI quiz database connection error",
          error: "Unable to connect to database while creating AI quiz",
          errorType: "AI_CONNECTION_ERROR"
        }, { status: 503 })
      }
      
      return NextResponse.json({
        message: "AI quiz database creation failed",
        error: errorMessage,
        errorType: "AI_DATABASE_ERROR"
      }, { status: 500 })
    }

  } catch (error) {
    console.error('General AI Quiz Generation Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle different types of general errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NextResponse.json({
        message: "Network error during AI quiz generation",
        error: "Unable to connect to external services",
        errorType: "NETWORK_ERROR"
      }, { status: 503 })
    }

    if (errorMessage.includes('timeout')) {
      return NextResponse.json({
        message: "AI quiz generation timeout",
        error: "Request timed out while generating quiz",
        errorType: "TIMEOUT_ERROR"
      }, { status: 408 })
    }

    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json({
        message: "Request format error",
        error: "Invalid request format for AI quiz generation",
        errorType: "FORMAT_ERROR"
      }, { status: 400 })
    }
    
    return NextResponse.json({
      message: "Unexpected error during AI quiz generation",
      error: errorMessage,
      errorType: "UNKNOWN_ERROR",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
