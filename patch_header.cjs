const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// We are going to replace the current <header> element with nothing, and move its contents to the sidebar.
// First, let's find the exact <header className="..."> block.

const headerRegex = /\{\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\n\s*HEADER BAR\n.*?\n\s*<\/header>/s;

if (headerRegex.test(content)) {
  content = content.replace(headerRegex, '');
  fs.writeFileSync('src/App.tsx', content);
  console.log("Removed header successfully.");
} else {
  console.log("Could not find the header to replace. Using start/end markers.");

  const startMarker = "{/* --------------------------------------------------------------------------\n         HEADER BAR";
  const endMarker = "</header>";

  let startIndex = content.indexOf(startMarker);
  if (startIndex !== -1) {
     let endIndex = content.indexOf(endMarker, startIndex);
     if (endIndex !== -1) {
         content = content.substring(0, startIndex) + content.substring(endIndex + endMarker.length);
         fs.writeFileSync('src/App.tsx', content);
         console.log("Removed header using markers.");
     }
  }
}
