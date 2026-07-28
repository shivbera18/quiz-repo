import { test, expect, type APIRequestContext } from "@playwright/test"

const QUIZ_ID = "sample-quiz-001"
const ORIGINAL_TITLE = "Sample Reasoning Test"

// The admin quiz-edit UI is a large, chapter/subject-dependent form, and the seeded
// fixture quiz deliberately has no chapter/subject association (see prisma/seed.ts).
// So this test drives the mutation through the same PATCH endpoint the admin UI
// calls (app/api/admin/quizzes/[id]/route.ts) rather than clicking through that form,
// and verifies propagation the same way a real student would see it: by loading the
// quiz-taking page in a real browser. That is the actual contract worth guarding here
// -- that an admin's edit is visible to students, with no stale read -- not that a
// particular button in a large form is wired correctly.
async function loginAsAdmin(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/auth/login", {
    data: { email: "admin@quizapp.com", password: "admin123", userType: "admin" },
  })
  expect(response.ok()).toBeTruthy()
  const { token } = await response.json()
  return token as string
}

async function setQuizTitle(request: APIRequestContext, token: string, title: string) {
  const response = await request.patch(`/api/admin/quizzes/${QUIZ_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { title },
  })
  expect(response.ok()).toBeTruthy()
}

test.describe("Admin edit propagates to students", () => {
  test.afterEach(async ({ request }) => {
    const token = await loginAsAdmin(request)
    await setQuizTitle(request, token, ORIGINAL_TITLE)
  })

  test("admin renames a quiz and a student sees the new title", async ({ page, request }) => {
    const newTitle = `Sample Reasoning Test (edited ${Date.now()})`

    const token = await loginAsAdmin(request)
    await setQuizTitle(request, token, newTitle)

    await page.goto("/auth/login")
    await page.locator("#email").fill("student@test.com")
    await page.locator("#password").fill("student123")
    await page.getByRole("button", { name: "Login as Student" }).click()
    await page.waitForURL("**/dashboard")

    await page.goto(`/quiz/${QUIZ_ID}`)
    await expect(page.getByTestId("quiz-title")).toHaveText(newTitle)
  })
})
