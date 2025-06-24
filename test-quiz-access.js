// Test direct quiz access
const testQuizAccess = async () => {
  try {
    console.log("Testing direct quiz access...")
    const quizResponse = await fetch("http://localhost:3000/api/quizzes/4676fca0-cb59-4803-9907-985001912e31");
    
    if (!quizResponse.ok) {
      console.error("Quiz access failed:", quizResponse.status, quizResponse.statusText);
      const errorText = await quizResponse.text();
      console.error("Error response:", errorText);
      return;
    }
    
    const quizData = await quizResponse.json();
    console.log("Quiz access successful!");
    console.log("Quiz:", quizData.quiz.title);
    console.log("Questions:", quizData.quiz.questions.length);
    console.log("Sections:", quizData.quiz.sections);
    console.log("Is Active:", quizData.quiz.isActive);
    console.log("Duration:", quizData.quiz.duration);
    console.log("First question:", quizData.quiz.questions[0]);
    
  } catch (error) {
    console.error("Test error:", error);
  }
};

testQuizAccess();
