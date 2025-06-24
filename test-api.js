// Test script to verify API endpoints are working
const testLogin = async () => {
  try {
    console.log("Testing student login...")
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "student@test.com",
        password: "password",
        userType: "student",
      }),
    });

    if (!loginResponse.ok) {
      console.error("Login failed:", loginResponse.status, loginResponse.statusText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log("Login successful:", loginData);

    // Test fetching quizzes
    console.log("\nTesting quiz fetch...");
    const quizzesResponse = await fetch("http://localhost:3000/api/quizzes", {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

    if (!quizzesResponse.ok) {
      console.error("Quiz fetch failed:", quizzesResponse.status, quizzesResponse.statusText);
      return;
    }

    const quizzes = await quizzesResponse.json();
    console.log("Quizzes fetched:", quizzes.length, "quizzes");
    
    if (quizzes.length > 0) {
      const firstQuiz = quizzes[0];
      console.log("First quiz:", firstQuiz.title, "ID:", firstQuiz.id);
      
      // Test fetching individual quiz
      console.log("\nTesting individual quiz fetch...");
      const quizResponse = await fetch(`http://localhost:3000/api/quizzes/${firstQuiz.id}`);
      
      if (!quizResponse.ok) {
        console.error("Individual quiz fetch failed:", quizResponse.status, quizResponse.statusText);
        return;
      }
      
      const quizData = await quizResponse.json();
      console.log("Quiz data fetched successfully!");
      console.log("Quiz:", quizData.quiz.title);
      console.log("Questions:", quizData.quiz.questions.length);
      console.log("Is Active:", quizData.quiz.isActive);
      console.log("Duration:", quizData.quiz.duration || quizData.quiz.timeLimit);
    }

  } catch (error) {
    console.error("Test error:", error);
  }
};

testLogin();
