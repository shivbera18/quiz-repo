const fs = require('fs');
const path = require('path');

// Make shadows brighter for better contrast in dark mode
const replacements = [
  // Increase opacity from 0.15 to 0.3 for normal shadows
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.15\)\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.3)]' },
  // Increase opacity from 0.2 to 0.4 for hover shadows
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.2\)\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.4)]' },
  
  // Increase opacity from 0.1 to 0.25 for softer shadows
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.1\)\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.25)]' },
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.15\)\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.35)]' },
  
  // Fix sidebar edge shadow
  { from: /dark:shadow-\[8px_0px_0px_0px_rgba\(255,255,255,0\.1\)\]/g, to: 'dark:shadow-[8px_0px_0px_0px_rgba(255,255,255,0.2)]' },
];

const extensions = ['.tsx', '.jsx', '.ts', '.js', '.css'];
const skipFolders = ['node_modules', '.git', '.next', 'dist', 'build'];

let totalChanges = 0;
let filesChanged = [];

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!extensions.includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileChanges = 0;

  for (const { from, to } of replacements) {
    const matches = content.match(from);
    if (matches) {
      fileChanges += matches.length;
      content = content.replace(from, to);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesChanged.push({ path: filePath, changes: fileChanges });
    totalChanges += fileChanges;
    console.log(`✓ ${filePath} (${fileChanges} changes)`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!skipFolders.includes(file)) {
        walkDir(filePath);
      }
    } else {
      processFile(filePath);
    }
  }
}

console.log('🔍 Fixing dark mode shadows...\n');
walkDir(process.cwd());

console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Files changed: ${filesChanged.length}`);
console.log(`   Total replacements: ${totalChanges}`);
console.log('='.repeat(50));

if (filesChanged.length > 0) {
  console.log('\n📁 Changed files:');
  filesChanged.forEach(f => console.log(`   - ${f.path} (${f.changes})`));
}
