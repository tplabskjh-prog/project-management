const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    
    autoHideMenuBar: true,     
    titleBarStyle: 'hidden',   
    titleBarOverlay: {         
      // 초기값: 라이트 모드(흰색)
      color: '#FFFFFF',        
      symbolColor: '#0F172A',  
      height: 48               
    },

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.setMenu(null);

  // ✅ React에서 보내는 테마 변경 신호를 수신해서 즉각 색상 변경!
  ipcMain.on('theme-change', (event, isDark) => {
    win.setTitleBarOverlay({
      color: isDark ? '#111827' : '#FFFFFF',       // 다크면 남색, 라이트면 흰색
      symbolColor: isDark ? '#F8FAFC' : '#0F172A'  // 다크면 흰 아이콘, 라이트면 검은 아이콘
    });
  });

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    win.loadURL(startUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});