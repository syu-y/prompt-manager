import { readFileSync, writeFileSync } from 'fs';

const indexPath = 'build/index.html';
let html = readFileSync(indexPath, 'utf8');

html = html.replace(/href="\/_app\//g, 'href="./_app/');
html = html.replace(/src="\/_app\//g, 'src="./_app/');
html = html.replace(/import\("\/_app\//g, 'import("./_app/');

writeFileSync(indexPath, html, 'utf8');
console.log('✓ Fixed all paths in index.html');
