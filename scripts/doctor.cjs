const fs = require('fs');
const path = require('path');
const net = require('net');

const root = path.resolve(__dirname, '..');
process.chdir(root);

function ok(label, value) {
  console.log(`${value ? '[OK]  ' : '[FAIL]'} ${label}`);
  return !!value;
}

console.log('RAKSHA local environment check');
console.log('Project:', root);
console.log('Node:', process.version);
console.log('npm must be available from your terminal.');
console.log('');

const major = Number(process.versions.node.split('.')[0]);
let good = true;
good = ok('Node.js 18 or newer', major >= 18) && good;
good = ok('package.json present', fs.existsSync(path.join(root, 'package.json'))) && good;
good = ok('Server/server.cjs present', fs.existsSync(path.join(root, 'Server', 'server.cjs'))) && good;
good = ok('src/main.tsx present', fs.existsSync(path.join(root, 'src', 'main.tsx'))) && good;

for (const pkg of ['express', 'react', 'react-dom', 'leaflet', 'vite', 'typescript']) {
  const packageFile = path.join(root, 'node_modules', ...pkg.split('/'), 'package.json');
  good = ok(`dependency: ${pkg}`, fs.existsSync(packageFile)) && good;
}

console.log('');
if (!good) {
  console.log('RAKSHA is not fully installed yet.');
  console.log('From THIS project folder run: npm install');
  process.exitCode = 1;
} else {
  console.log('Dependencies are installed.');
  console.log('Backend: npm run server');
  console.log('Frontend: npm run dev');
}
