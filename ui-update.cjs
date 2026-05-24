const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('./src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Apply Notion minimalist UI rules
  content = content.replace(/rounded-2xl/g, 'rounded');
  content = content.replace(/rounded-xl/g, 'rounded');
  content = content.replace(/rounded-lg/g, 'rounded-sm');
  content = content.replace(/text-\[40px\]\s+font-extrabold\s+text-primary([^\"]*?)font-pixel/g, 'text-[32px] font-bold text-primary font-heading leading-tight tracking-tight');
  content = content.replace(/text-\[40px\]/g, 'text-[32px]');
  content = content.replace(/font-pixel/g, 'font-heading');
  content = content.replace(/bg-primary\s+text-on-primary/g, 'bg-secondary text-on-secondary hover:opacity-90');
  content = content.replace(/shadow-xl|shadow-lg|shadow-md|shadow-sm/g, '');
  content = content.replace(/border-outline-variant\/30/g, 'border-outline-variant/60');
  
  if (original !== content) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
});
