import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import quizzesRoutes from "./routes/quizzes.js"
import resultsRoutes from "./routes/results.js"
import subjectsRoutes from "./routes/subjects.js"
import chaptersRoutes from "./routes/chapters.js"
import analyticsRoutes from "./routes/analytics.js"
import announcementsRoutes from "./routes/announcements.js"
import pushSubscriptionRoutes from "./routes/push-subscription.js"
import aiRoutes from "./routes/ai.js"
import adminQuizzesRoutes from "./routes/admin/quizzes.js"
import adminUsersRoutes from "./routes/admin/users.js"
import adminSubjectsRoutes from "./routes/admin/subjects.js"
import adminChaptersRoutes from "./routes/admin/chapters.js"
import adminQuestionBankRoutes from "./routes/admin/question-bank.js"
import adminAnnouncementsRoutes from "./routes/admin/announcements.js"
import adminAnalyticsRoutes from "./routes/admin/analytics.js"
import adminResultsRoutes from "./routes/admin/results.js"
import adminUserPerformanceRoutes from "./routes/admin/user-performance.js"
import subjectsChaptersQuizzesRoutes from "./routes/admin/subjects-chapters-quizzes.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use("/api/auth", authRoutes)
app.use("/api/quizzes", quizzesRoutes)
app.use("/api/results", resultsRoutes)
app.use("/api/subjects", subjectsRoutes)
app.use("/api/chapters", chaptersRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/announcements", announcementsRoutes)
app.use("/api/push-subscription", pushSubscriptionRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/generate-flashcards", aiRoutes)
app.use("/api/admin/quizzes", adminQuizzesRoutes)
app.use("/api/admin/users", adminUsersRoutes)
app.use("/api/admin/subjects", adminSubjectsRoutes)
app.use("/api/admin/chapters", adminChaptersRoutes)
app.use("/api/admin/question-bank", adminQuestionBankRoutes)
app.use("/api/admin/announcements", adminAnnouncementsRoutes)
app.use("/api/admin/analytics", adminAnalyticsRoutes)
app.use("/api/admin/results", adminResultsRoutes)
app.use("/api/admin/user-performance", adminUserPerformanceRoutes)
app.use("/api/admin/subjects-chapters-quizzes", subjectsChaptersQuizzesRoutes)

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`)
})