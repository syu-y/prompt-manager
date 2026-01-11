import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { initDatabase } from './db/index.js';
import { registerProjectHandlers } from './ipc/projects.js';
import { registerEntryHandlers } from './ipc/entries.js';
import { registerTagHandlers } from './ipc/tags.js';

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
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 開発環境ではlocalhost、本番環境ではビルドしたファイルを読み込む
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
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
