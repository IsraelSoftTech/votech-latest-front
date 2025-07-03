const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const mysql = require('mysql2/promise');
const express = require('express');

let mainWindow;
let backendServer;
let tray;
let statusCheckInterval;
let server;
let browserOpened = false; // Prevent multiple opens

// Initialize logger
const log = {
  info: (...args) => {
    const logPath = path.join(app.getPath('userData'), 'logs.txt');
    const message = `[INFO] ${new Date().toISOString()}: ${args.join(' ')}\n`;
    fs.appendFileSync(logPath, message);
    console.log(...args);
  },
  error: (...args) => {
    const logPath = path.join(app.getPath('userData'), 'logs.txt');
    const message = `[ERROR] ${new Date().toISOString()}: ${args.join(' ')}\n`;
    fs.appendFileSync(logPath, message);
    console.error(...args);
  }
};

// System status
const status = {
  backend: false,
  database: false,
  frontend: false
};

function showError(title, content) {
  dialog.showErrorBox(title, content);
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'frontend/public/favicon.ico'));
  updateTrayMenu();
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Status:', enabled: false },
    { label: `Backend: ${status.backend ? '✓' : '✗'}`, enabled: false },
    { label: `Database: ${status.database ? '✓' : '✗'}`, enabled: false },
    { label: `Frontend: ${status.frontend ? '✓' : '✗'}`, enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => mainWindow?.show() },
    { label: 'View Logs', click: () => openLogs() },
    { label: 'Run Diagnostics', click: () => runDiagnostics() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Quick Desk');

  // Update tray icon based on overall status
  const allGood = status.backend && status.database && status.frontend;
  tray.setImage(path.join(__dirname, allGood ? 'frontend/public/favicon.ico' : 'frontend/public/favicon-error.ico'));
}

// Open logs
function openLogs() {
  const logPath = path.join(app.getPath('userData'), 'logs.txt');
  require('electron').shell.openPath(logPath);
}

// Database utilities
async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    // Check if database exists
    const [rows] = await connection.query('SHOW DATABASES LIKE "mpasat_online"');
    if (rows.length === 0) {
      log.info('Database not found, creating...');
      await connection.query('CREATE DATABASE mpasat_online');
      
      // Switch to the new database
      await connection.query('USE mpasat_online');
      
      // Create tables
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          contact VARCHAR(255),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          type VARCHAR(50),
          name VARCHAR(255),
          amount DECIMAL(10,2),
          currency VARCHAR(10),
          description TEXT,
          date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    }

    await connection.end();
    return true;
  } catch (error) {
    log.error('Database check failed:', error);
    return false;
  }
}

// Diagnostics
async function runDiagnostics() {
  const results = {
    system: {},
    database: {},
    network: {}
  };

  // System checks
  results.system.nodeVersion = process.versions.node;
  results.system.electronVersion = process.versions.electron;
  results.system.platform = process.platform;
  results.system.arch = process.arch;
  results.system.memory = `${Math.round(process.getSystemMemoryInfo().total / 1024)} MB`;
  results.system.tempDir = app.getPath('temp');
  results.system.userData = app.getPath('userData');

  // Database checks
  try {
    results.database.connection = await checkDatabase();
    if (results.database.connection) {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'mpasat_online'
      });
      const [tables] = await connection.query('SHOW TABLES');
      results.database.tables = tables.map(table => Object.values(table)[0]);
      await connection.end();
    }
  } catch (error) {
    results.database.error = error.message;
  }

  // Network checks
  results.network.port = backendServer?.address()?.port;
  
  // Show results in a new window
  const diagnosticWindow = new BrowserWindow({
    width: 600,
    height: 800,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>System Diagnostics</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { color: #333; }
          .section { margin-bottom: 20px; }
          .item { margin: 10px 0; }
          .status { padding: 2px 6px; border-radius: 3px; }
          .success { background: #e6ffe6; color: #006600; }
          .error { background: #ffe6e6; color: #660000; }
        </style>
      </head>
      <body>
        <h1>Quick Desk Diagnostics</h1>
        <div class="section">
          <h2>System Information</h2>
          ${Object.entries(results.system).map(([key, value]) => `
            <div class="item">
              <strong>${key}:</strong> ${value}
            </div>
          `).join('')}
        </div>
        <div class="section">
          <h2>Database Status</h2>
          ${Object.entries(results.database).map(([key, value]) => `
            <div class="item">
              <strong>${key}:</strong> 
              <span class="status ${value ? 'success' : 'error'}">
                ${typeof value === 'object' ? JSON.stringify(value) : value}
              </span>
            </div>
          `).join('')}
        </div>
        <div class="section">
          <h2>Network Status</h2>
          ${Object.entries(results.network).map(([key, value]) => `
            <div class="item">
              <strong>${key}:</strong> ${value}
            </div>
          `).join('')}
        </div>
      </body>
    </html>
  `;

  diagnosticWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

// Status monitoring
function startStatusMonitoring() {
  statusCheckInterval = setInterval(async () => {
    // Check database
    status.database = await checkDatabase();

    // Check backend
    status.backend = !!backendServer;

    // Check frontend
    status.frontend = !!mainWindow && !mainWindow.isDestroyed();

    // Update tray menu
    updateTrayMenu();
  }, 5000); // Check every 5 seconds
}

async function startBackend() {
  try {
    log.info('Starting backend server...');
    const { startServer } = require('./backend/server.js');
    const serverInstance = await startServer();
    backendServer = serverInstance.server;
    const port = serverInstance.port;
    log.info(`Backend server started successfully on port ${port}`);
    status.backend = true;
    updateTrayMenu();
    return port;
  } catch (error) {
    log.error('Failed to start backend:', error);
    status.backend = false;
    updateTrayMenu();
    showError('Backend Error', 'Failed to start the application server. Please check if MySQL is running and try again.');
    throw error;
  }
}

// Create Express server
const expressApp = express();

expressApp.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quick Desk</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          .status { margin: 20px 0; }
          .status-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Quick Desk</h1>
          <div class="status">
            <div class="status-item">
              Application Status: <span class="success">Running</span>
            </div>
            <div class="status-item">
              Server Status: <span class="success">Connected</span>
            </div>
            <div class="status-item" id="dbStatus">
              Database Status: <span class="checking">Checking...</span>
            </div>
          </div>
        </div>
        <script>
          fetch('/check-db')
            .then(response => response.json())
            .then(data => {
              const dbStatus = document.getElementById('dbStatus');
              if (data.connected) {
                dbStatus.innerHTML = 'Database Status: <span class="success">Connected</span>';
              } else {
                dbStatus.innerHTML = 'Database Status: <span class="error">Not Connected</span>';
              }
            })
            .catch(error => {
              const dbStatus = document.getElementById('dbStatus');
              dbStatus.innerHTML = 'Database Status: <span class="error">Error</span>';
            });
        </script>
      </body>
    </html>
  `);
});

expressApp.get('/check-db', (req, res) => {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mpasat_online'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      res.json({ connected: false, error: err.message });
      return;
    }
    connection.end();
    res.json({ connected: true });
  });
});

async function createWindow() {
  try {
    log.info('Creating main window...');
    log.info('App path:', app.getAppPath());
    log.info('User data path:', app.getPath('userData'));

    // Ensure database exists and is properly configured
    const dbOk = await checkDatabase();
    if (!dbOk) {
      throw new Error('Failed to initialize database');
    }

    // Start backend first
    const port = await startBackend();

    // Start Express server
    server = expressApp.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      }
    });

    // Set global API URL
    global.API_URL = `http://localhost:${port}`;

    // Load the React app
    if (isDev) {
      log.info('Loading development URL...');
      await mainWindow.loadURL('http://localhost:3000');
    } else {
      // Robustly resolve the build path for production
      // Try several possible locations for the build folder
      let indexPathCandidates = [
        path.join(__dirname, '..', 'build', 'index.html'), // most common after packaging
        path.join(__dirname, 'build', 'index.html'),       // fallback
        path.join(process.resourcesPath, 'app', 'build', 'index.html'), // electron-builder asar
        path.join(process.resourcesPath, 'build', 'index.html')         // another possible
      ];
      let foundIndexPath = null;
      for (const candidate of indexPathCandidates) {
        if (fs.existsSync(candidate)) {
          foundIndexPath = candidate;
          break;
        }
      }
      if (foundIndexPath) {
        log.info('Loading production path:', foundIndexPath);
        await mainWindow.loadFile(foundIndexPath);
        status.frontend = true;
      } else {
        log.error('Index file not found in any known location. Tried:', indexPathCandidates.join(', '));
        status.frontend = false;
        showError('Loading Error', 'Application files not found. Please reinstall the application.');
        throw new Error('Frontend build files not found');
      }
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      log.info('Window shown');
      // Open frontend and backend in browser only once per app launch
      if (!browserOpened) {
        browserOpened = true;
        // Open frontend
        if (isDev) {
          shell.openExternal('http://localhost:3000');
        } else {
          // In production, open the local Express server (status page)
          shell.openExternal(`http://localhost:${port}`);
        }
        // Open backend status page (always on port 5000)
        shell.openExternal('http://localhost:5000');
      }
    });

  } catch (error) {
    log.error('Failed to create window:', error);
    showError('Startup Error', 'Failed to start the application. Please check the logs and try again.');
    app.quit();
  }
}

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  showError('Application Error', 'An unexpected error occurred. Please restart the application.');
});

// App event handlers
app.whenReady().then(() => {
  createWindow().catch(error => {
    log.error('Failed to create window:', error);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    if (backendServer) {
      backendServer.close(() => {
        log.info('Backend server closed');
      });
    }
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  log.info('App activated');
  if (mainWindow === null) {
    createWindow().catch(error => {
      log.error('Failed to create window on activate:', error);
    });
  } else {
    mainWindow.show();
  }
});

app.on('quit', () => {
  log.info('Application quitting');
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }
}); 