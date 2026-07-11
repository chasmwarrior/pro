const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `  );
}

export default MapLibreView;`;
const replace = `  );
});

export default MapLibreView;`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Fixed React.memo closing parenthesis');
