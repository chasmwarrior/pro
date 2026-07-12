const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// There is an unclosed <div> in the sidebar. Let's close it before </nav>
const regex = /\n(\s*)(\{\/\* Quick user details inside sidebar \*\/})/g;
content = content.replace(regex, '\n$1</div>\n$1$2');

fs.writeFileSync('src/App.tsx', content);
