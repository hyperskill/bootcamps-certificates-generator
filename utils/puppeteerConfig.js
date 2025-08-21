const puppeteer = require('puppeteer');

const createBrowserConfig = () => {
  // Enhanced Replit detection
  const isReplit = process.env.REPL_ID || 
                   process.env.REPLIT_DB_URL || 
                   process.env.REPL_SLUG ||
                   (process.platform === 'linux' && process.env.HOME?.includes('runner'));
  
  if (isReplit) {
    console.log('🚀 Configuring Puppeteer for Replit environment');
    return {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--deterministic-fetch',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
                     '/nix/store/*-chromium-*/bin/chromium'
    };
  }
  
  console.log('💻 Configuring Puppeteer for local development');
  // Local development configuration
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
};

const launchBrowser = async () => {
  try {
    const config = createBrowserConfig();
    console.log('🌐 Launching browser with config:', {
      isReplit: !!(process.env.REPL_ID || process.env.REPLIT_DB_URL),
      executablePath: config.executablePath || 'default',
      argsCount: config.args.length
    });
    
    const browser = await puppeteer.launch(config);
    console.log('✅ Browser launched successfully');
    return browser;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error.message);
    
    // Fallback configuration for edge cases
    console.log('🔄 Attempting fallback browser configuration...');
    try {
      const fallbackConfig = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };
      
      const browser = await puppeteer.launch(fallbackConfig);
      console.log('✅ Browser launched with fallback configuration');
      return browser;
    } catch (fallbackError) {
      console.error('❌ Fallback browser launch also failed:', fallbackError.message);
      throw new Error(`Failed to launch browser: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
  }
};

module.exports = {
  createBrowserConfig,
  launchBrowser
};
