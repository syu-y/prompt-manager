"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const index_js_1 = require('./db/index.cjs');
const projects_js_1 = require('./ipc/projects.cjs');
const entries_js_1 = require('./ipc/entries.cjs');
const tags_js_1 = require('./ipc/tags.cjs');
// IME（日本語入力）を有効化
// Linux/WSL2環境での日本語入力を改善
if (process.platform === 'linux') {
    // X11でのIME有効化を試みる
    electron_1.app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');
    // GPU加速を無効化することでIMEの問題を回避
    electron_1.app.commandLine.appendSwitch('disable-gpu');
}
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        frame: true,
        minimizable: true,
        maximizable: true,
        resizable: true,
        closable: true,
        // タイトル設定
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    // データベース初期化
    (0, index_js_1.initDatabase)();
    // IPCハンドラ登録
    (0, projects_js_1.registerProjectHandlers)(electron_1.ipcMain);
    (0, entries_js_1.registerEntryHandlers)(electron_1.ipcMain);
    (0, tags_js_1.registerTagHandlers)(electron_1.ipcMain);
    // メニューバーを非表示にする
    electron_1.Menu.setApplicationMenu(null);
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
