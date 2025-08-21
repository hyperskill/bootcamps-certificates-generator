/**
 * Environment detection and debugging utilities
 */

const getEnvironmentInfo = () => {
  const isReplit = !!(process.env.REPL_ID || process.env.REPLIT_DB_URL);
  const isLocal = !isReplit;
  
  return {
    platform: process.platform,
    nodeVersion: process.version,
    environment: {
      isReplit,
      isLocal,
      hasReplId: !!process.env.REPL_ID,
      hasReplitDB: !!process.env.REPLIT_DB_URL
    },
    puppeteer: {
      chromeBin: process.env.CHROME_BIN,
      puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      puppeteerSkipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
    }
  };
};

const logEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  console.log('🌍 Environment Information:');
  console.log(`   Platform: ${info.platform}`);
  console.log(`   Node.js: ${info.nodeVersion}`);
  console.log(`   Environment: ${info.environment.isReplit ? 'Replit' : 'Local'}`);
  
  if (info.environment.isReplit) {
    console.log('🔧 Replit Configuration:');
    console.log(`   REPL_ID: ${info.environment.hasReplId ? 'Present' : 'Missing'}`);
    console.log(`   REPLIT_DB_URL: ${info.environment.hasReplitDB ? 'Present' : 'Missing'}`);
  }
  
  console.log('🔧 Puppeteer Configuration:');
  console.log(`   Chrome Binary: ${info.puppeteer.chromeBin || 'Default'}`);
  console.log(`   Executable Path: ${info.puppeteer.puppeteerExecutablePath || 'Default'}`);
  console.log(`   Skip Download: ${info.puppeteer.puppeteerSkipDownload || 'False'}`);
};

module.exports = {
  getEnvironmentInfo,
  logEnvironmentInfo
};
