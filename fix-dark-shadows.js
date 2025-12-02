const fs = require('fs');
const path = require('path');

// Make shadows brighter and sync borders in dark mode
const replacements = [
  // SHADOWS - Make them brighter (toward white, not grey)
  // Normal shadows: 0.3 -> 0.5
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.3\)\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.5)]' },
  // Hover shadows: 0.4 -> 0.6
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.4\)\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.6)]' },
  // Softer shadows: 0.25 -> 0.45
  { from: /dark:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.25\)\]/g, to: 'dark:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.45)]' },
  { from: /dark:hover:shadow-\[(\d+)px_(\d+)px_0px_0px_rgba\(255,255,255,0\.35\)\]/g, to: 'dark:hover:shadow-[$1px_$2px_0px_0px_rgba(255,255,255,0.55)]' },
  // Sidebar edge shadow: 0.2 -> 0.4
  { from: /dark:shadow-\[8px_0px_0px_0px_rgba\(255,255,255,0\.2\)\]/g, to: 'dark:shadow-[8px_0px_0px_0px_rgba(255,255,255,0.4)]' },
  
  // BORDERS - Sync with shadows (make them softer but visible)
  // Full white borders -> 50% opacity
  { from: /dark:border-white/50(?!\/)/g, to: 'dark:border-white/50' },
  // Already partial opacity borders - make them brighter
  { from: /dark:border-white/50\/20/g, to: 'dark:border-white/50' },
  { from: /dark:border-white/50\/30/g, to: 'dark:border-white/50' },
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
