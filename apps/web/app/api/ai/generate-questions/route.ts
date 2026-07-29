// AI Question Generator API Route
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { topic, difficulty, count, section } = await request.json()

    if (!topic || !difficulty || !count || !section) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, difficulty, count, section' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `Generate ${count} ${difficulty} level multiple choice questions for the "${section}" section about "${topic}".

Requirements:
- Each question should have exactly 4 options
- Only one correct answer per question
- Include a clear explanation for the correct answer
- Add relevant tags for categorization
- Make questions challenging but fair
- Ensure variety in question types

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
Count: ${count}

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const aiContent = response.text()

    if (!aiContent) {
      throw new Error('No content received from AI')
    }

    // Clean the response to extract JSON
    let cleanedContent = aiContent.trim()
    
    // Remove markdown code blocks if present
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsedQuestions = JSON.parse(cleanedContent)
    
    // Validate the response structure
    if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
      throw new Error('Invalid response format from AI')
    }

    // Validate each question
    for (const q of parsedQuestions.questions) {
      if (!q.question || !q.options || q.options.length !== 4 || 
          q.correctAnswer === undefined || !q.explanation) {
        throw new Error('Invalid question format from AI')
      }
    }

    return NextResponse.json({
      success: true,
      questions: parsedQuestions.questions,
      metadata: {
        topic,
        section,
        difficulty,
        count: parsedQuestions.questions.length,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('AI Question Generation Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
