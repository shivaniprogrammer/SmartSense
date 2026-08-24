const fs = require("fs");
const path = require("path");

const FAVICON_TAG = '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>%E2%9C%A8</text></svg>">';

const folder = __dirname;
const files = fs.readdirSync(folder).filter(f => f.endsWith(".html"));

let updatedCount = 0;
let skippedCount = 0;

files.forEach(file => {
  const filePath = path.join(folder, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes('rel="icon"')) {
    console.log(`Skipped (already has a favicon): ${file}`);
    skippedCount++;
    return;
  }

  const charsetRegex = /<meta charset="UTF-8">/i;

  if (charsetRegex.test(content)) {
    content = content.replace(charsetRegex, match => `${match}\n    ${FAVICON_TAG}`);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${file}`);
    updatedCount++;
  } else {
    console.log(`Could not find <meta charset> in: ${file} — skipped, add manually`);
    skippedCount++;
  }
});

console.log(`\nDone. Updated ${updatedCount} file(s), skipped ${skippedCount}.`);
