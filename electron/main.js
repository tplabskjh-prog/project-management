const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    
    autoHideMenuBar: true,     
    titleBarStyle: 'hidden',   
    titleBarOverlay: {         
      // 💡 초기값: 라이트 모드 사이드바 배경색과 동일하게 맞춤
      color: '#FFFFFF',        
      symbolColor: '#18181B',  
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
      // 💡 다크 모드일 때 우측 사이드바 배경색인 #13161C 적용
      color: isDark ? '#13161C' : '#FFFFFF',       
      // 💡 다크 모드 아이콘 색상을 너무 튀지 않는 톤(#A1A1AA)으로 부드럽게 매칭
      symbolColor: isDark ? '#A1A1AA' : '#18181B'  
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