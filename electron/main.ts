import { app, BrowserWindow, ipcMain, Menu, protocol } from 'electron';
import * as path from 'path';
import { initDatabase } from './db/index.js';
import { registerProjectHandlers } from './ipc/projects.js';
import { registerEntryHandlers } from './ipc/entries.js';
import { registerTagHandlers } from './ipc/tags.js';
import { createServer } from 'http';
import { readFileSync } from 'fs';

// IME（日本語入力）を有効化
// Linux/WSL2環境での日本語入力を改善
if (process.platform === 'linux') {
  // X11でのIME有効化を試みる
  app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');
  // GPU加速を無効化することでIMEの問題を回避
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

  // 開発環境ではlocalhost、本番環境ではビルドしたファイルを読み込む
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const buildPath = path.join(__dirname, '../build');
    createServer((req, res) => {
      const file = req.url === '/' ? '/index.html' : req.url;
      if (file) {
        const filePath = path.join(buildPath, file);
        try {
          res.end(readFileSync(filePath));
        } catch {
          res.end(readFileSync(path.join(buildPath, 'index.html')));
        }
      }
    }).listen(0, 'localhost', function () {
      mainWindow?.loadURL(`http://localhost:${this.address().port}`);
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

  // メニューバーを非表示にする
  Menu.setApplicationMenu(null);

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
