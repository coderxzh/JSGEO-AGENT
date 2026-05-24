const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Replace hover background missing dark hover prefix!
      content = content.replace(/hover:bg-\[#f7f7f5\] dark:bg-surface-variant\/45/g, 'hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45');
      content = content.replace(/hover:bg-\[#f7f7f5\] dark:bg-surface-variant\/40/g, 'hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/40');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('./src/views');
