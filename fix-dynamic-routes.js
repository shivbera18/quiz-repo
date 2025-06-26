// Script to fix all API routes with dynamic server usage issues
// This adds 'export const dynamic = "force-dynamic"' to all routes that need it

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Next.js 14+ Dynamic Server Usage Issues...\n');

// List of API routes that likely need the dynamic export
const routesToFix = [
  'app/api/admin/users/route.ts',
  'app/api/admin/quizzes/route.ts',
  'app/api/quizzes/route.ts',
  'app/api/admin/quizzes/[id]/route.ts',
  'app/api/admin/question-bank/route.ts',
  'app/api/admin/question-bank/[id]/route.ts',
  'app/api/ai/generate-quiz/route.ts',
  'app/api/results/route.ts',
  'app/api/results/[id]/route.ts',
  'app/api/results/history/route.ts',
  'app/api/admin/results/route.ts',
  'app/api/admin/stats/route.ts',
  'app/api/admin/quizzes/[id]/questions/route.ts'
];

function addDynamicExport(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`✅ Already has dynamic export: ${filePath}`);
      return false;
    }

    // Check if it uses request.headers (needs dynamic)
    if (!content.includes('request.headers')) {
      console.log(`ℹ️  Doesn't use request.headers: ${filePath}`);
      return false;
    }

    // Find the first import statement and add dynamic export after imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('const ')) {
        lastImportIndex = i;
      } else if (lines[i].trim() === '' || lines[i].trim().startsWith('//')) {
        continue;
      } else {
        break;
      }
    }

    if (lastImportIndex === -1) {
      console.log(`⚠️  Could not find import section: ${filePath}`);
      return false;
    }

    // Insert dynamic export after imports
    lines.splice(lastImportIndex + 1, 0, '', '// Force this route to be dynamic (not statically rendered)', 'export const dynamic = \'force-dynamic\'');
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`✅ Added dynamic export: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

let fixedCount = 0;

console.log('📋 Processing API routes...\n');

routesToFix.forEach(route => {
  const fullPath = path.join(process.cwd(), route);
  if (addDynamicExport(fullPath)) {
    fixedCount++;
  }
});

console.log(`\n🎯 Summary: Fixed ${fixedCount} API routes\n`);

console.log('📝 Next steps:');
console.log('1. Review the changes');
console.log('2. Test locally to ensure no breaking changes');
console.log('3. Commit and deploy to fix Vercel issues');
console.log('4. Check Vercel logs to confirm the error is resolved');
