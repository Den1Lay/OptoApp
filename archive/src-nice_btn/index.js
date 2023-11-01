const { app, BrowserWindow, ipcMain } = require('electron');
// const delay = require('delay');
const { SerialPort } = require('serialport');
const path = require('path');
const ipc = ipcMain;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  let mainPort;

  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    mainPort.write(title, (er) => {
      if(er) {
        return console.log('Error on write: ', er.message)
      }
      console.log('Message written');
    })

  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  const dataBuffer = [];

  const portsAr = [];
  SerialPort.list().then(ports => {
    ports.forEach((port) => {
      console.log(port.path);
      portsAr.push(port.path);
    });

    mainPort = new SerialPort({
      path: portsAr[0],
      baudRate: 9600,
    })
    
    mainPort.open((er) => {
      if(er.message != 'Port is opening') {
        console.log('Error opening port: ', er.message);
      }
      console.log('Success open port');
    });

    const localBuffer = []
    mainPort.on('readable', async () => {
      const data = mainPort.read()
      console.log(new Date(), "Date: ", data);
      localBuffer.push(data);
      console.log("localBuffer: ", localBuffer);
      // await delay(10000);
    });
    
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



