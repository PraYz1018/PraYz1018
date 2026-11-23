import { app, BrowserWindow, Menu } from 'electron';
import { bootOffice } from './server.mjs';

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-http-cache');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

async function openWindow() {
  Menu.setApplicationMenu(null);
  const { url } = await bootOffice();
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: '櫃檯',
    backgroundColor: '#121714',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  await win.loadURL(url);
}

app.whenReady().then(openWindow).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
