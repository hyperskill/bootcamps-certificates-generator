const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

const findChromiumPath = () => {
  try {
    // Try to find Chromium in common Replit Nix store locations
    const nixStorePaths = [
      '/nix/store',
      '/usr/bin',
      '/opt/render/project/.nix-profile/bin',
      '/home/runner/.nix-profile/bin'
    ];
    
    for (const basePath of nixStorePaths) {
      if (fs.existsSync(basePath)) {
        try {
          // Try to find chromium executable
          const findCommand = `find ${basePath} -name "chromium*" -type f -executable 2>/dev/null | head -1`;
          const chromiumPath = execSync(findCommand, { encoding: 'utf8' }).trim();
          if (chromiumPath && fs.existsSync(chromiumPath)) {
            console.log(`✅ Found Chromium at: ${chromiumPath}`);
            return chromiumPath;
          }
        } catch (e) {
          // Continue searching
        }
      }
    }
    
    // Try alternative method for Nix store
    try {
      const nixStoreChromium = execSync('ls /nix/store/ | grep chromium | head -1', { encoding: 'utf8' }).trim();
      if (nixStoreChromium) {
        const fullPath = `/nix/store/${nixStoreChromium}/bin/chromium`;
        if (fs.existsSync(fullPath)) {
          console.log(`✅ Found Chromium via nix store: ${fullPath}`);
          return fullPath;
        }
      }
    } catch (e) {
      // Continue to fallback
    }
    
    console.log('⚠️ Chromium not found in standard locations');
    return null;
  } catch (error) {
    console.log('⚠️ Error finding Chromium:', error.message);
    return null;
  }
};

const createBrowserConfig = () => {
  // Enhanced Replit detection
  const isReplit = process.env.REPL_ID || 
                   process.env.REPLIT_DB_URL || 
                   process.env.REPL_SLUG ||
                   (process.platform === 'linux' && process.env.HOME?.includes('runner'));
  
  if (isReplit) {
    console.log('🚀 Configuring Puppeteer for Replit environment');
    const chromiumPath = findChromiumPath();
    
    const config = {
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
      ]
    };
    
    if (chromiumPath) {
      config.executablePath = chromiumPath;
    }
    
    return config;
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
    console.error('❌ Primary browser launch failed:', error.message);
    
    // Progressive fallback strategies
    const fallbackConfigs = [
      {
        name: 'Fallback 1: Default Puppeteer with minimal args',
        config: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      },
      {
        name: 'Fallback 2: Bundled Chromium',
        config: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      },
      {
        name: 'Fallback 3: System Chrome/Chromium',
        config: {
          headless: true,
          executablePath: 'google-chrome-stable',
          args: ['--no-sandbox']
        }
      }
    ];
    
    for (const fallback of fallbackConfigs) {
      try {
        console.log(`🔄 Trying ${fallback.name}...`);
        const browser = await puppeteer.launch(fallback.config);
        console.log(`✅ Browser launched with ${fallback.name}`);
        return browser;
      } catch (fallbackError) {
        console.log(`❌ ${fallback.name} failed: ${fallbackError.message}`);
        continue;
      }
    }
    
    // If all fallbacks fail, throw comprehensive error
    throw new Error(`All browser launch attempts failed. Primary error: ${error.message}. Check if Chromium is properly installed in your Replit environment.`);
  }
};

module.exports = {
  createBrowserConfig,
  launchBrowser
};
