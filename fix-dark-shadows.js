const fs = require('fs');
const path = require('path');

// Replace white shadows with gray shadows in dark mode
const replacements = [
  // Change bright white shadows to soft gray
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_#fff\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.15)]' },
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_#fff\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.2)]' },
  
  // Change #757373 shadows to softer gray
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_#757373\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.1)]' },
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_#757373\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.15)]' },
  
  // Fix sidebar shadows (8px_0px pattern)
  { from: /dark:shadow-\[8px_0px_0px_0px_#fff\]/g, to: 'dark:shadow-[8px_0px_0px_0px_rgba(255,255,255,0.1)]' },
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
