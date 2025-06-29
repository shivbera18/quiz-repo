import { type NextRequest, NextResponse } from "next/server"
import { prisma, VercelPrismaClient } from "@/lib/prisma-client"
import { parseJsonField, stringifyForDatabase } from "@/lib/database-utils"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Calculate analytics for each quiz
    const quizzes = await prisma.quiz.findMany({ include: { results: true } })
    const quizAnalytics = quizzes.map((quiz) => {
      const attempts = quiz.results.length
      const avgScore = attempts > 0 ? Math.round(quiz.results.reduce((sum, r) => sum + r.totalScore, 0) / attempts) : 0
      const avgTime = attempts > 0 ? Math.round(quiz.results.reduce((sum, r) => sum + r.timeSpent, 0) / attempts) : 0
      
      // Parse questions and sections to ensure they're always arrays
      const questionsArr = parseJsonField(quiz.questions);
      const sectionsArr = parseJsonField(quiz.sections);
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.timeLimit,
        chapterId: quiz.chapterId,
        sections: sectionsArr,
        questions: questionsArr,
        isActive: quiz.isActive,
        createdAt: quiz.createdAt.toISOString(),
        createdBy: quiz.createdBy,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        attempts,
        avgScore,
        avgTime,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      }
    })

    return NextResponse.json({ quizzes: quizAnalytics })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ 
        message: "Authentication required", 
        error: "Missing or invalid authorization header",
        errorType: "AUTH_ERROR"
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ 
        message: "Invalid authentication token", 
        error: "Token is too short or malformed",
        errorType: "AUTH_ERROR"
      }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      duration,
      subjectId,
      chapterId,
      sections,
      questions,
      negativeMarking,
      negativeMarkValue,
    } = body

    // Comprehensive input validation with specific error messages
    const validationErrors = []

    // Title validation
    if (!title) {
      validationErrors.push({
        field: "title",
        message: "Quiz title is required",
        errorType: "VALIDATION_ERROR"
      })
    } else if (typeof title !== 'string') {
      validationErrors.push({
        field: "title", 
        message: "Quiz title must be a string",
        errorType: "VALIDATION_ERROR"
      })
    } else if (title.trim().length < 3) {
      validationErrors.push({
        field: "title",
        message: "Quiz title must be at least 3 characters long",
        errorType: "VALIDATION_ERROR"
      })
    } else if (title.trim().length > 200) {
      validationErrors.push({
        field: "title",
        message: "Quiz title cannot exceed 200 characters",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Duration validation
    if (!duration && duration !== 0) {
      validationErrors.push({
        field: "duration",
        message: "Quiz duration is required",
        errorType: "VALIDATION_ERROR"
      })
    } else if (typeof duration !== 'number' || isNaN(duration)) {
      validationErrors.push({
        field: "duration",
        message: "Quiz duration must be a valid number",
        errorType: "VALIDATION_ERROR"
      })
    } else if (duration < 5) {
      validationErrors.push({
        field: "duration",
        message: "Quiz duration must be at least 5 minutes",
        errorType: "VALIDATION_ERROR"
      })
    } else if (duration > 300) {
      validationErrors.push({
        field: "duration", 
        message: "Quiz duration cannot exceed 300 minutes (5 hours)",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Subject validation
    if (!subjectId) {
      validationErrors.push({
        field: "subjectId",
        message: "Subject selection is required for proper quiz organization",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Chapter validation  
    if (!chapterId) {
      validationErrors.push({
        field: "chapterId",
        message: "Chapter selection is required for proper quiz organization",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Sections validation
    if (!sections) {
      validationErrors.push({
        field: "sections",
        message: "At least one section is required (e.g., Quantitative, Reasoning, English)",
        errorType: "VALIDATION_ERROR"
      })
    } else if (!Array.isArray(sections)) {
      validationErrors.push({
        field: "sections",
        message: "Sections must be provided as an array",
        errorType: "VALIDATION_ERROR"
      })
    } else if (sections.length === 0) {
      validationErrors.push({
        field: "sections",
        message: "At least one section is required (e.g., Quantitative, Reasoning, English)",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Negative marking validation
    if (negativeMarking === true) {
      if (negativeMarkValue === undefined || negativeMarkValue === null) {
        validationErrors.push({
          field: "negativeMarkValue",
          message: "Negative marking value is required when negative marking is enabled",
          errorType: "VALIDATION_ERROR"
        })
      } else if (typeof negativeMarkValue !== 'number' || isNaN(negativeMarkValue)) {
        validationErrors.push({
          field: "negativeMarkValue",
          message: "Negative marking value must be a valid number",
          errorType: "VALIDATION_ERROR"
        })
      } else if (negativeMarkValue < 0.1 || negativeMarkValue > 1.0) {
        validationErrors.push({
          field: "negativeMarkValue",
          message: "Negative marking value must be between 0.1 and 1.0",
          errorType: "VALIDATION_ERROR"
        })
      }
    }

    // Questions validation
    if (questions && !Array.isArray(questions)) {
      validationErrors.push({
        field: "questions",
        message: "Questions must be provided as an array",
        errorType: "VALIDATION_ERROR"
      })
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json({
        message: "Validation failed",
        errors: validationErrors,
        errorType: "VALIDATION_ERROR",
        totalErrors: validationErrors.length
      }, { status: 400 })
    }

    // Verify chapter exists and belongs to subject (if both provided)
    if (chapterId && subjectId) {
      try {
        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
          include: { subject: true }
        })

        if (!chapter) {
          return NextResponse.json({
            message: "Chapter not found",
            error: `Chapter with ID "${chapterId}" does not exist`,
            errorType: "RESOURCE_NOT_FOUND",
            field: "chapterId"
          }, { status: 404 })
        }

        if (chapter.subjectId !== subjectId) {
          return NextResponse.json({
            message: "Chapter does not belong to selected subject",
            error: `Chapter "${chapter.name}" belongs to subject "${chapter.subject.name}", not the selected subject`,
            errorType: "RELATIONSHIP_ERROR",
            field: "chapterId"
          }, { status: 400 })
        }
      } catch (dbError) {
        console.error("Database error during chapter validation:", dbError)
        return NextResponse.json({
          message: "Failed to validate chapter",
          error: "Database error while checking chapter validity",
          errorType: "DATABASE_ERROR"
        }, { status: 500 })
      }
    }

    const { title: validatedTitle, description: validatedDescription, duration: validatedDuration, chapterId: validatedChapterId, sections: validatedSections, questions: validatedQuestions, negativeMarking: validatedNegativeMarking, negativeMarkValue: validatedNegativeMarkValue } = body

    // Detailed logging for Vercel debugging
    console.log('[QUIZ_CREATION] Starting database operation...')
    console.log('[QUIZ_CREATION] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL
    })

    // Test database connection first
    const connectionTest = await VercelPrismaClient.testConnection()
    if (!connectionTest.success) {
      console.error('[QUIZ_CREATION] Database connection test failed:', connectionTest)
      return NextResponse.json({
        message: "Database connection failed",
        error: connectionTest.error,
        errorType: "DATABASE_CONNECTION_ERROR",
        details: connectionTest.details
      }, { status: 503 })
    }
    console.log('[QUIZ_CREATION] Database connection test passed')

    // Log the data being inserted
    const dataToInsert = {
      title: validatedTitle,
      description: validatedDescription || "",
      timeLimit: validatedDuration,
      chapterId: validatedChapterId || null,
      sections: stringifyForDatabase(validatedSections),
      questions: stringifyForDatabase(validatedQuestions || []),
      isActive: true,
      createdBy: "admin",
      negativeMarking: validatedNegativeMarking ?? true,
      negativeMarkValue: validatedNegativeMarkValue ?? 0.25,
    }
    
    console.log('[QUIZ_CREATION] Data to insert:', {
      ...dataToInsert,
      sections: typeof dataToInsert.sections,
      questions: typeof dataToInsert.questions,
      sectionsLength: dataToInsert.sections.length,
      questionsLength: dataToInsert.questions.length
    })

    // Save new quiz to the database using Prisma
    const createdQuiz = await prisma.quiz.create({
      data: dataToInsert,
    })

    // Parse questions and sections back to arrays for response
    const questionsArr = parseJsonField(createdQuiz.questions);
    const sectionsArr = parseJsonField(createdQuiz.sections);
    
    const responseQuiz = {
      ...createdQuiz,
      questions: questionsArr,
      sections: sectionsArr,
    }

    return NextResponse.json({ quiz: responseQuiz })
  } catch (error) {
    console.error("Error creating quiz:", error)
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as any)?.code
    
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: errorMessage,
      code: errorCode
    })
    
    // Handle specific Prisma errors with detailed messages
    if (errorCode === 'P2002') {
      const targetField = (error as any)?.meta?.target?.[0] || 'field'
      return NextResponse.json({ 
        message: "Duplicate entry error",
        error: `A quiz with this ${targetField} already exists`,
        errorType: "DUPLICATE_ERROR",
        field: targetField
      }, { status: 400 })
    }
    
    if (errorCode === 'P2003') {
      const targetField = (error as any)?.meta?.field_name || 'chapterId'
      return NextResponse.json({ 
        message: "Invalid reference error",
        error: `The ${targetField} does not exist in the database`,
        errorType: "FOREIGN_KEY_ERROR",
        field: targetField
      }, { status: 400 })
    }

    if (errorCode === 'P2025') {
      return NextResponse.json({
        message: "Record not found",
        error: "Referenced record does not exist",
        errorType: "RECORD_NOT_FOUND"
      }, { status: 404 })
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError && errorMessage.includes('JSON')) {
      return NextResponse.json({
        message: "Invalid request format",
        error: "Request body contains invalid JSON",
        errorType: "JSON_PARSE_ERROR"
      }, { status: 400 })
    }

    // Handle network/connection errors
    if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
      return NextResponse.json({
        message: "Database connection error",
        error: "Unable to connect to the database",
        errorType: "CONNECTION_ERROR"
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      message: "Internal server error during quiz creation",
      error: errorMessage,
      errorType: "INTERNAL_SERVER_ERROR"
    }, { status: 500 })
  }
}
