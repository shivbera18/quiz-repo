// Assign existing orphaned quizzes to chapters
async function assignQuizzesToChapters() {
  try {
    console.log('🔧 Assigning orphaned quizzes to chapters...\n');
    
    // Get existing quizzes
    const quizzesResponse = await fetch('http://localhost:3000/api/admin/quizzes', {
      headers: {
        'Authorization': 'Bearer admin-token-placeholder'
      }
    });
    
    if (!quizzesResponse.ok) {
      throw new Error('Failed to fetch quizzes');
    }
    
    const quizzesData = await quizzesResponse.json();
    const quizzes = quizzesData.quizzes || [];
    
    console.log(`Found ${quizzes.length} total quiz(es)`);
    
    // Find orphaned quizzes (no chapterId)
    const orphanedQuizzes = quizzes.filter(quiz => !quiz.chapterId);
    console.log(`Found ${orphanedQuizzes.length} orphaned quiz(es):`);
    
    orphanedQuizzes.forEach(quiz => {
      console.log(`- "${quiz.title}" (ID: ${quiz.id})`);
    });
    
    if (orphanedQuizzes.length === 0) {
      console.log('✅ No orphaned quizzes found - all quizzes are properly assigned!');
      return;
    }
    
    // Get available chapters
    const subjectsResponse = await fetch('http://localhost:3000/api/subjects');
    const subjects = await subjectsResponse.json();
    
    if (subjects.length === 0) {
      console.log('❌ No subjects found! Cannot assign quizzes.');
      return;
    }
    
    const firstSubject = subjects[0];
    const chaptersResponse = await fetch(`http://localhost:3000/api/subjects/${firstSubject.id}/chapters`);
    const chapters = await chaptersResponse.json();
    
    if (chapters.length === 0) {
      console.log('❌ No chapters found! Cannot assign quizzes.');
      return;
    }
    
    const targetChapter = chapters[0]; // Use first available chapter
    console.log(`\n🎯 Assigning orphaned quizzes to:`);
    console.log(`Subject: ${firstSubject.name}`);
    console.log(`Chapter: ${targetChapter.name}`);
    
    // Assign each orphaned quiz to the chapter
    for (const quiz of orphanedQuizzes) {
      console.log(`\n🔄 Updating quiz "${quiz.title}"...`);
      
      const updateData = {
        ...quiz,
        chapterId: targetChapter.id,
        // Ensure these fields are properly formatted
        sections: Array.isArray(quiz.sections) ? quiz.sections : JSON.parse(quiz.sections || '[]'),
        questions: Array.isArray(quiz.questions) ? quiz.questions : JSON.parse(quiz.questions || '[]')
      };
      
      const updateResponse = await fetch(`http://localhost:3000/api/admin/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token-placeholder'
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        console.log(`✅ Successfully assigned quiz "${quiz.title}" to chapter "${targetChapter.name}"`);
      } else {
        const errorText = await updateResponse.text();
        console.log(`❌ Failed to update quiz "${quiz.title}": ${errorText}`);
      }
    }
    
    console.log('\n🎉 Quiz assignment complete!');
    console.log('📍 Quizzes should now appear in: Sectional Tests → Subject → Chapter');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

assignQuizzesToChapters();
