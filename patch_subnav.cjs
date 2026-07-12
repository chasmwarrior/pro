const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* Sub-navigation Controls tabs \*\/\}.*?\{adminSubTab === 'radar' && \(/s;
const startStr = "{/* Sub-navigation Controls tabs */}";
const endStr = "{adminSubTab === 'radar' && (";

let startIndex = content.indexOf(startStr);
let endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Removed sub-navigation tabs from Admin console view.");
} else {
  console.log("Could not find start or end index.");
}
