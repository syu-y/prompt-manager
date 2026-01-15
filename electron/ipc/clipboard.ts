import { clipboard, IpcMain } from 'electron';

export function registerClipboardHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('clipboard:writeText', (event, text: string) => {
    clipboard.writeText(text);
    return { success: true };
  });
}
