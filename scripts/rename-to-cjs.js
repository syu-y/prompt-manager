import { readdirSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const electronDir = join(__dirname, '..', 'electron');

console.log('Renaming .js files to .cjs in electron directory...');

const files = readdirSync(electronDir, { recursive: true});
const jsFiles = [];

// ステップ1: ファイルをリネーム
files.forEach(file => {
  if (file.endsWith('.js')) {
    const oldPath = join(electronDir, file);
    const newPath = join(electronDir, file.replace('.js', '.cjs'));
    
    try {
      renameSync(oldPath, newPath);
      jsFiles.push(file.replace('.js', '.cjs'));
      console.log(`✓ Renamed: ${file} → ${file.replace('.js', '.cjs')}`);
    } catch (error) {
      console.error(`✗ Failed to rename ${file}:`, error.message);
    }
  }
  
  // .js.map も .cjs.map にリネーム
  if (file.endsWith('.js.map')) {
    const oldPath = join(electronDir, file);
    const newPath = join(electronDir, file.replace('.js.map', '.cjs.map'));
    
    try {
      renameSync(oldPath, newPath);
      console.log(`✓ Renamed: ${file} → ${file.replace('.js.map', '.cjs.map')}`);
    } catch (error) {
      console.error(`✗ Failed to rename ${file}:`, error.message);
    }
  }
});

// ステップ2: .cjsファイル内のrequire文を修正
console.log('\nUpdating require statements in .cjs files...');

jsFiles.forEach(file => {
  const filePath = join(electronDir, file);
  
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // require('./xxx.js') → require('./xxx.cjs') に変換
    content = content.replace(/require\(['"]\.\/([^'"]+)\.js['"]\)/g, "require('./$1.cjs')");
    
    // require('./db/index.js') などのパターンも対応
    content = content.replace(/require\(['"]\.\/([^'"]+)\.js['"]\)/g, "require('./$1.cjs')");
    
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${file}`);
  } catch (error) {
    console.error(`✗ Failed to update ${file}:`, error.message);
  }
});

console.log('\nDone!');
