import { test, expect } from "@playwright/test"

// Exercises the quiz-taking flow end to end against the deterministic fixtures seeded
// by prisma/seed.ts (student-001 / sample-quiz-001). Both seeded questions have
// correctAnswer index 1, so answering index 1 on both yields a 100.00% score --
// this pins the whole client scoring pipeline (see lib/scoring.ts) against a known
// answer key, not just "a score renders".
test.describe("Quiz taking flow", () => {
  test("student can log in, take the sample quiz, submit, and see their score", async ({ page }) => {
    await page.goto("/auth/login")
    await page.locator("#email").fill("student@test.com")
    await page.locator("#password").fill("student123")
    await page.getByRole("button", { name: "Login as Student" }).click()
    await page.waitForURL("**/dashboard")

    await page.goto("/quiz/sample-quiz-001")
    await expect(page.getByTestId("quiz-title")).toHaveText("Sample Reasoning Test")

    // Question 1 of 2: correct answer is option index 1 ("32").
    await page.getByTestId("quiz-option-1").click()
    await page.getByTestId("question-nav-1").click()

    // Question 2 of 2: correct answer is option index 1 ("Some cats may be pets").
    await page.getByTestId("quiz-option-1").click()

    await page.getByTestId("submit-quiz-trigger").click()
    await page.getByTestId("submit-quiz-confirm").click()

    await page.waitForURL("**/results/**")
    await expect(page.getByTestId("final-score")).toHaveText("100.00%")
  })

  test("wrong answers and an unanswered question produce the expected negative-marked score", async ({ page }) => {
    await page.goto("/auth/login")
    await page.locator("#email").fill("student@test.com")
    await page.locator("#password").fill("student123")
    await page.getByRole("button", { name: "Login as Student" }).click()
    await page.waitForURL("**/dashboard")

    await page.goto("/quiz/sample-quiz-001")

    // Question 1: answer wrong (index 0, correct is 1). With negativeMarking on and
    // negativeMarkValue 0.25, and question 2 left unanswered:
    // rawScore = -0.25, totalScore = max(0, (-0.25 / 2) * 100) = 0.
    await page.getByTestId("quiz-option-0").click()

    await page.getByTestId("submit-quiz-trigger").click()
    await page.getByTestId("submit-quiz-confirm").click()

    await page.waitForURL("**/results/**")
    await expect(page.getByTestId("final-score")).toHaveText("0.00%")
  })
})
