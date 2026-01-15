import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { AddressInfo } from 'net';
import * as path from 'path';
import { initDatabase } from './db/index.js';
import { registerProjectHandlers } from './ipc/projects.js';
import { registerEntryHandlers } from './ipc/entries.js';
import { registerTagHandlers } from './ipc/tags.js';
import { registerTemplateHandlers } from './ipc/templates.js';
import { registerClipboardHandlers } from './ipc/clipboard.js';

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');
  app.commandLine.appendSwitch('disable-gpu');
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    frame: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
    closable: true,
    title: 'Prompt Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // ウィンドウを最大化
  mainWindow.maximize();

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const buildPath = path.join(__dirname, '../build');
    const server = createServer((req, res) => {

      const file = req.url === '/' ? '/index.html' : req.url;

      if (file) {
        const filePath = path.join(buildPath, file);

        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        };

        try {
          const content = readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
          res.end(content);
        } catch {
          const content = readFileSync(path.join(buildPath, 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        }
      }
    });

    server.listen(0, 'localhost', () => {
      const port = (server.address() as AddressInfo).port;
      mainWindow?.loadURL(`http://localhost:${port}`);
      // mainWindow?.webContents.openDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {

  // データベース初期化
  initDatabase();

  // IPCハンドラ登録
  registerProjectHandlers(ipcMain);
  registerEntryHandlers(ipcMain);
  registerTagHandlers(ipcMain);
  registerTemplateHandlers(ipcMain);
  registerClipboardHandlers(ipcMain);

  // メニューバーを非表示にする
  Menu.setApplicationMenu(null);

  // 画面を作成する
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
