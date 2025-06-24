// Centralized data store for the application
// In production, this would be replaced with a real database

export interface User {
  id: string
  name: string
  email: string
  password: string
  isAdmin: boolean
  userType: "admin" | "student"
  createdAt: string
  lastLogin?: string
  quizHistory: any[]
  totalQuizzes: number
  averageScore: number
}

export interface Quiz {
  id: string
  title: string
  description: string
  sections: {
    reasoning?: any[]
    quantitative?: any[]
    english?: any[]
  }
  timeLimit: number
  createdAt: string
  createdBy: string
}

export interface QuizResult {
  _id: string
  quizId: string
  userId: string
  userName: string
  userEmail: string
  date: string
  totalScore: number
  sections: {
    reasoning?: { score: number; total: number }
    quantitative?: { score: number; total: number }
    english?: { score: number; total: number }
  }
  answers: any[]
  timeSpent: number
}

// Global data store
class DataStore {
  private static instance: DataStore
  private users: User[] = []
  private quizzes: Quiz[] = []
  private results: QuizResult[] = []

  private constructor() {
    // Initialize with default data
    this.users = [
      {
        id: "1",
        name: "System Admin",
        email: "admin@bank.com",
        password: "password",
        isAdmin: true,
        userType: "admin",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        quizHistory: [],
        totalQuizzes: 0,
        averageScore: 0,
      },
      {
        id: "2",
        name: "Demo Student",
        email: "student@example.com",
        password: "password",
        isAdmin: false,
        userType: "student",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        quizHistory: [],
        totalQuizzes: 0,
        averageScore: 0,
      },
    ]

    // Initialize with sample quiz
    this.quizzes = [
      {
        id: "1",
        title: "Banking Fundamentals Mock Test",
        description: "Complete mock test covering all banking exam topics",
        sections: {
          reasoning: [
            {
              id: "1",
              question: "If A is taller than B, and B is taller than C, who is the shortest?",
              options: ["A", "B", "C", "Cannot be determined"],
              correct: 2,
              explanation: "Since A > B > C in height, C is the shortest.",
            },
          ],
          quantitative: [
            {
              id: "2",
              question: "What is 15% of 200?",
              options: ["25", "30", "35", "40"],
              correct: 1,
              explanation: "15% of 200 = (15/100) × 200 = 30",
            },
          ],
          english: [
            {
              id: "3",
              question: "Choose the correct sentence:",
              options: ["He don't like coffee", "He doesn't like coffee", "He not like coffee", "He no like coffee"],
              correct: 1,
              explanation: "The correct form uses 'doesn't' for third person singular.",
            },
          ],
        },
        timeLimit: 60,
        createdAt: new Date().toISOString(),
        createdBy: "1",
      },
    ]
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore()
    }
    return DataStore.instance
  }

  // User methods
  public getUsers(): User[] {
    return [...this.users]
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id)
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email)
  }

  public addUser(user: User): void {
    this.users.push(user)
    console.log(`User added: ${user.email}. Total users: ${this.users.length}`)
  }

  public updateUser(id: string, updates: Partial<User>): boolean {
    const index = this.users.findIndex((user) => user.id === id)
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates }
      return true
    }
    return false
  }

  // Quiz methods
  public getQuizzes(): Quiz[] {
    return [...this.quizzes]
  }

  public getQuizById(id: string): Quiz | undefined {
    return this.quizzes.find((quiz) => quiz.id === id)
  }

  public addQuiz(quiz: Quiz): void {
    this.quizzes.push(quiz)
  }

  public updateQuiz(id: string, updates: Partial<Quiz>): boolean {
    const index = this.quizzes.findIndex((quiz) => quiz.id === id)
    if (index !== -1) {
      this.quizzes[index] = { ...this.quizzes[index], ...updates }
      return true
    }
    return false
  }

  public deleteQuiz(id: string): boolean {
    const index = this.quizzes.findIndex((quiz) => quiz.id === id)
    if (index !== -1) {
      this.quizzes.splice(index, 1)
      return true
    }
    return false
  }

  // Results methods
  public getResults(): QuizResult[] {
    return [...this.results]
  }

  public getResultById(id: string): QuizResult | undefined {
    return this.results.find((result) => result._id === id)
  }

  public getResultsByUserId(userId: string): QuizResult[] {
    return this.results.filter((result) => result.userId === userId)
  }

  public addResult(result: QuizResult): void {
    this.results.push(result)

    // Update user statistics
    const user = this.getUserById(result.userId)
    if (user) {
      user.quizHistory.push(result._id)
      user.totalQuizzes = user.quizHistory.length

      // Calculate new average score
      const userResults = this.getResultsByUserId(result.userId)
      const totalScore = userResults.reduce((sum, r) => sum + r.totalScore, 0)
      user.averageScore = Math.round(totalScore / userResults.length)

      console.log(`Updated user ${user.email} stats: ${user.totalQuizzes} quizzes, ${user.averageScore}% avg`)
    }
  }

  // Debug method
  public getStats() {
    return {
      users: this.users.length,
      quizzes: this.quizzes.length,
      results: this.results.length,
    }
  }
}

export const dataStore = DataStore.getInstance()
