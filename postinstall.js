// postinstall.js
if (process.env.RENDER) {
  const { execSync } = require('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
}