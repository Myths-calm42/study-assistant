
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

// Middleware
const allowedOrigins = [
  'http://localhost:5173'
]

app.use(cors({
  origin: allowedOrigins
}))

app.use(express.json({ limit: '1mb' }))

// Zod input validation
const inputSchema = z.object({
  topic: z.string().trim().min(10).max(10000),
  mode: z.enum(['flashcards', 'quiz'])
})

// Zod output validation
const studySchema = z.object({
  title: z.string().min(1),
  flashcards: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1)
    })
  ),
  quiz: z.array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string()).length(4),
      correctAnswerIndex: z.number().int().min(0).max(3),
      explanation: z.string().min(1)
    })
  )
})

// Gemini JSON schema
const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    flashcards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          answer: { type: 'STRING' }
        },
        required: ['question', 'answer']
      }
    },
    quiz: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          },
          correctAnswerIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' }
        },
        required: [
          'question',
          'options',
          'correctAnswerIndex',
          'explanation'
        ]
      }
    }
  },
  required: ['title', 'flashcards', 'quiz']
}
// Retry helper for temporary Gemini service failures
const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

async function generateWithRetry(request, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Gemini request attempt ${attempt}/${maxAttempts}`)

      return await ai.models.generateContent(request)

    } catch (error) {
      const errorMessage = error.message || ''

      const isUnavailable =
        error.status === 503 ||
        error.code === 503 ||
        errorMessage.includes('"code":503')

      if (!isUnavailable || attempt === maxAttempts) {
        throw error
      }

      const delay = 1000 * (2 ** (attempt - 1))

      console.log(
        `Gemini temporarily unavailable. Retrying in ${delay / 1000} seconds...`
      )

      await wait(delay)
    }
  }
}
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Study Assistant backend is running!',
    timestamp: new Date().toISOString()
  })
})

// Generate study material
app.post('/api/generate', async (req, res) => {
  
  try {
    // 1. Validate user input
    const validation = inputSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      })
    }

    const { topic, mode } = validation.data

    


    // 2. Prepare AI prompt
    const prompt = `
You are an expert educational assistant.

Create study material from the following notes.

Learning mode: ${mode}

Study notes:
${topic}

Instructions:
- Create a meaningful title.
- Create exactly 5 flashcards.
- Each flashcard must have a clear question and accurate answer.
- Create exactly 5 multiple-choice questions.
- Each question must have exactly 4 options.
- correctAnswerIndex must be zero-based (0, 1, 2, or 3).
- Provide an explanation for every correct answer.
- Use only information supported by the supplied notes.
- If information is insufficient, do not invent facts.
- Return valid JSON matching the requested schema.
`

    // 3. Call Gemini
    const response = await generateWithRetry({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
        maxOutputTokens: 4096
      }
    })

    

// 4. Check response
console.log('Gemini response received')

console.log('Response text:', response.text)
console.log('Response finish reason:', response.candidates?.[0]?.finishReason)

if (!response.text) {
  console.error('Gemini returned an empty response')

  return res.status(502).json({
    success: false,
    error: 'AI returned an empty response. Please retry.'
  })
}

// 5. Parse JSON
let generatedData

try {
  generatedData = JSON.parse(response.text)
} catch (error) {
  console.error('JSON parsing failed:', error.message)
  console.error('Raw Gemini response:', response.text)

  return res.status(502).json({
    success: false,
    error: 'AI returned malformed JSON. Please retry.'
  })
}

    // 6. Validate generated data
    const result = studySchema.safeParse(generatedData)

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: 'AI returned data with an invalid structure.',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      })
    }

    // 7. Return valid response
    return res.status(200).json({
      success: true,
      mode,
      data: result.data
    })

} catch (error) {
    console.error('Generation error:', error.message)

    const errorMessage = error.message || ''

    const isUnavailable =
      error.status === 503 ||
      errorMessage.includes('"code":503')

    if (isUnavailable) {
      return res.status(503).json({
        success: false,
        error: 'AI service is temporarily busy. Please try again shortly.',
        retryable: true
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Unable to generate study material. Please try again.',
      retryable: false
    })
}
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
