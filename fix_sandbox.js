const fs = require('fs');

const vsPath = 'src/services/ViewerService.ts';
let code = fs.readFileSync(vsPath, 'utf8');

code = code.replace(
  '      const args = [',
  '      const args = [\n        "--no-sandbox",\n        "--disable-setuid-sandbox",'
);
fs.writeFileSync(vsPath, code, 'utf8');
