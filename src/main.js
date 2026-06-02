const { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isVisible = true;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 360,
    height: 300,
    x: width - 380,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'audioCapture', 'videoCapture', 'desktopCapture', 'screen'];
    callback(allowed.includes(permission));
  });

  mainWindow.setContentProtection(true);
  mainWindow.webContents.on('did-finish-load', () => {
    // Re-apply after page load — some capture tools check at render time
    mainWindow.setContentProtection(true);
  });
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  // Ctrl+Space — show/hide overlay
  globalShortcut.register('Control+Space', () => {
    if (!mainWindow) return;
    if (isVisible) { mainWindow.hide(); isVisible = false; }
    else { mainWindow.show(); mainWindow.setAlwaysOnTop(true, 'screen-saver', 1); isVisible = true; }
  });

  // Ctrl+S — ask AI
  globalShortcut.register('Control+S', () => {
    if (mainWindow) mainWindow.webContents.send('trigger-ask');
  });

  // Ctrl+Shift+S — capture screenshot
  globalShortcut.register('Control+Shift+S', () => {
    if (mainWindow) mainWindow.webContents.send('trigger-screenshot');
  });

  // Ctrl+Shift+M — toggle mic
  globalShortcut.register('Control+Shift+M', () => {
    if (mainWindow) mainWindow.webContents.send('toggle-mic');
  });

  // Ctrl+Shift+R — reset window position
  globalShortcut.register('Control+Shift+R', () => {
    if (!mainWindow) return;
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(width - 380, 20);
  });

  // Ctrl+Shift+A — toggle speaker/system audio
  globalShortcut.register('Control+Shift+A', () => {
    if (mainWindow) mainWindow.webContents.send('toggle-sys');
  });

  // Ctrl+Shift+Q — quit
  globalShortcut.register('Control+Shift+Q', () => { app.quit(); });
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Quit
ipcMain.on('quit', () => { app.quit(); });

// Auto-resize height (width stays 360)
ipcMain.on('resize', (event, h) => {
  if (!mainWindow) return;
  mainWindow.setSize(360, Math.max(44, Math.min(h, 720)));
});

// Move window with Ctrl+Arrow
ipcMain.on('move-window', (event, [dx, dy]) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

// Get desktop sources for screen capture
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
  return sources.map(s => ({ id: s.id, name: s.name }));
});

// Capture screenshot as base64 JPEG
ipcMain.handle('capture-screenshot', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  if (sources.length > 0) {
    return sources[0].thumbnail.toJPEG(85).toString('base64');
  }
  return null;
});

// Save notes to disk
ipcMain.handle('save-notes', async (event, content) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Meeting Notes',
    defaultPath: `meeting-notes-${new Date().toISOString().slice(0, 10)}.md`,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });
  if (filePath) { fs.writeFileSync(filePath, content, 'utf8'); return true; }
  return false;
});
