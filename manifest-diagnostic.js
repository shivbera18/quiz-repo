// Comprehensive Manifest 404 Diagnostic Script
const fs = require('fs');
const path = require('path');

console.log('🔍 MANIFEST 404 DIAGNOSTIC - COMPREHENSIVE CHECK\n');
console.log('=' .repeat(60));

// 1. Check if manifest.json exists in correct locations
console.log('\n📁 1. CHECKING MANIFEST.JSON LOCATIONS:');
const locations = [
  { path: './public/manifest.json', name: 'Public directory (CORRECT)' },
  { path: './manifest.json', name: 'Root directory (WRONG)' },
  { path: './src/manifest.json', name: 'Src directory (WRONG)' },
  { path: './app/manifest.json', name: 'App directory (WRONG)' }
];

locations.forEach(loc => {
  const exists = fs.existsSync(loc.path);
  console.log(`${exists ? '✅' : '❌'} ${loc.name}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
});

// 2. Check manifest.json content
console.log('\n📝 2. CHECKING MANIFEST.JSON CONTENT:');
const manifestPath = './public/manifest.json';
if (fs.existsSync(manifestPath)) {
  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);
    
    console.log('✅ Manifest file is valid JSON');
    console.log('📋 Key fields:');
    console.log(`   Name: "${manifest.name || 'MISSING'}"`);
    console.log(`   Short Name: "${manifest.short_name || 'MISSING'}"`);
    console.log(`   Start URL: "${manifest.start_url || 'MISSING'}"`);
    console.log(`   Icons: ${manifest.icons ? manifest.icons.length + ' found' : 'MISSING'}`);
    
    if (manifest.icons) {
      console.log('🖼️ Icons:');
      manifest.icons.forEach((icon, i) => {
        console.log(`   ${i + 1}. ${icon.src} (${icon.sizes})`);
      });
    }
  } catch (error) {
    console.log('❌ Invalid JSON:', error.message);
  }
} else {
  console.log('❌ No manifest.json found in public directory');
}

// 3. Check layout.tsx for manifest reference
console.log('\n🔗 3. CHECKING HTML MANIFEST REFERENCE:');
const layoutPath = './app/layout.tsx';
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // Look for manifest reference
  const manifestRefs = layoutContent.match(/<link[^>]*rel=["']manifest["'][^>]*>/gi);
  if (manifestRefs) {
    console.log('✅ Found manifest references:');
    manifestRefs.forEach(ref => console.log(`   ${ref}`));
  } else {
    console.log('❌ No manifest reference found in layout.tsx');
    console.log('📝 You need to add: <link rel="manifest" href="/manifest.json">');
  }
  
  // Check for head section
  const headMatch = layoutContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    console.log('\n📋 HEAD SECTION CONTENT:');
    const headContent = headMatch[1].trim();
    console.log(headContent.substring(0, 500) + (headContent.length > 500 ? '...' : ''));
  }
} else {
  console.log('❌ app/layout.tsx not found');
}

// 4. Check alternative document files
console.log('\n📄 4. CHECKING ALTERNATIVE DOCUMENT FILES:');
const altFiles = [
  './pages/_document.tsx',
  './pages/_document.js',
  './app/head.tsx',
  './components/head.tsx'
];

altFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('manifest')) {
      console.log('   📝 Contains manifest reference');
    } else {
      console.log('   ❌ No manifest reference found');
    }
  }
});

// 5. Check public directory structure
console.log('\n📁 5. CHECKING PUBLIC DIRECTORY STRUCTURE:');
const publicDir = './public';
if (fs.existsSync(publicDir)) {
  console.log('✅ Public directory exists');
  const files = fs.readdirSync(publicDir, { withFileTypes: true });
  
  console.log('📋 Contents:');
  files.forEach(file => {
    if (file.isDirectory()) {
      console.log(`📁 ${file.name}/`);
      try {
        const subFiles = fs.readdirSync(path.join(publicDir, file.name));
        subFiles.forEach(subFile => {
          console.log(`   📄 ${subFile}`);
        });
      } catch (e) {
        console.log(`   ❌ Cannot read: ${e.message}`);
      }
    } else {
      console.log(`📄 ${file.name}`);
    }
  });
} else {
  console.log('❌ Public directory not found');
}

// 6. Check icon files
console.log('\n🖼️ 6. CHECKING ICON FILES:');
const iconPaths = [
  './public/icons/icon-192x192.png',
  './public/icons/icon-512x512.png',
  './public/icons/icon-192x192.svg',
  './public/icons/icon-512x512.svg'
];

iconPaths.forEach(iconPath => {
  const exists = fs.existsSync(iconPath);
  console.log(`${exists ? '✅' : '❌'} ${iconPath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  if (exists) {
    const stats = fs.statSync(iconPath);
    console.log(`   Size: ${stats.size} bytes`);
  }
});

// 7. Check build configuration
console.log('\n⚙️ 7. CHECKING BUILD CONFIGURATION:');
const configFiles = [
  './next.config.js',
  './next.config.mjs',
  './package.json',
  './vercel.json',
  './netlify.toml'
];

configFiles.forEach(configPath => {
  if (fs.existsSync(configPath)) {
    console.log(`✅ Found: ${configPath}`);
    const content = fs.readFileSync(configPath, 'utf8');
    
    // Check for relevant configuration
    if (configPath.includes('next.config')) {
      if (content.includes('manifest') || content.includes('public')) {
        console.log('   📝 Contains manifest/public configuration');
      }
    }
    
    if (configPath.includes('package.json')) {
      try {
        const pkg = JSON.parse(content);
        console.log(`   Build script: ${pkg.scripts?.build || 'Not found'}`);
        console.log(`   Dev script: ${pkg.scripts?.dev || 'Not found'}`);
      } catch (e) {
        console.log('   ❌ Invalid package.json');
      }
    }
  }
});

// 8. Check git status
console.log('\n📊 8. SUMMARY AND RECOMMENDATIONS:');
console.log('=' .repeat(40));

// Determine issues and provide fixes
const issues = [];
const fixes = [];

if (!fs.existsSync('./public/manifest.json')) {
  issues.push('❌ manifest.json not in public directory');
  fixes.push('Move manifest.json to public/ directory');
}

if (fs.existsSync('./app/layout.tsx')) {
  const layoutContent = fs.readFileSync('./app/layout.tsx', 'utf8');
  if (!layoutContent.includes('rel="manifest"') && !layoutContent.includes("rel='manifest'")) {
    issues.push('❌ No manifest reference in HTML head');
    fixes.push('Add <link rel="manifest" href="/manifest.json"> to head');
  }
}

if (issues.length === 0) {
  console.log('✅ No obvious issues found with manifest setup');
} else {
  console.log('🚨 ISSUES FOUND:');
  issues.forEach(issue => console.log(`   ${issue}`));
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  fixes.forEach(fix => console.log(`   • ${fix}`));
}

console.log('\n🌐 NEXT STEPS:');
console.log('1. Fix any issues listed above');
console.log('2. Commit and push changes to git');
console.log('3. Redeploy your site');
console.log('4. Test https://yourdomain.com/manifest.json');
console.log('5. Try PWABuilder again');

console.log('\n' + '=' .repeat(60));
console.log('DIAGNOSTIC COMPLETE');
