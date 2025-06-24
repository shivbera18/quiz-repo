// Test complete flow: login -> get quizzes -> access specific quiz
const testCompleteFlow = async () => {
  try {
    console.log("=== Testing Complete Student Flow ===")
    
    // Step 1: Login
    console.log("\n1. Testing student login...")
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
      console.error("❌ Login failed:", loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    console.log("✅ Login successful:", loginData.user.name);
    const token = loginData.token;

    // Step 2: Get quiz list
    console.log("\n2. Fetching available quizzes...")
    const quizzesResponse = await fetch("http://localhost:3000/api/quizzes", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

    if (!quizzesResponse.ok) {
      console.error("❌ Quiz list fetch failed:", quizzesResponse.status);
      return;
    }

    const quizzes = await quizzesResponse.json();
    console.log(`✅ Found ${quizzes.length} available quizzes`);
    
    if (quizzes.length === 0) {
      console.log("❌ No quizzes available");
      return;
    }

    const firstQuiz = quizzes[0];
    console.log(`📝 First quiz: "${firstQuiz.title}" (${firstQuiz.questions.length} questions)`);

    // Step 3: Access specific quiz (quiz-taking page)
    console.log("\n3. Accessing quiz for taking...");
    const quizResponse = await fetch(`http://localhost:3000/api/quizzes/${firstQuiz.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

    if (!quizResponse.ok) {
      console.error("❌ Quiz access failed:", quizResponse.status);
      return;
    }

    const quizData = await quizResponse.json();
    const quiz = quizData.quiz;
    
    console.log("✅ Quiz accessed successfully!");
    console.log(`📊 Quiz: "${quiz.title}"`);
    console.log(`⏱️  Duration: ${quiz.duration} minutes`);
    console.log(`📝 Questions: ${quiz.questions.length}`);
    console.log(`🔴 Active: ${quiz.isActive}`);
    console.log(`📚 Sections: ${quiz.sections.join(", ")}`);
    console.log(`🎯 Sample question: "${quiz.questions[0].question}"`);
    
    console.log("\n🎉 Complete flow test successful!");
    console.log("✅ Students should now be able to:");
    console.log("   1. Log in successfully");
    console.log("   2. See quizzes in their dashboard");
    console.log("   3. Start and take quizzes without 'Quiz not found' errors");

  } catch (error) {
    console.error("❌ Test error:", error);
  }
};

testCompleteFlow();
