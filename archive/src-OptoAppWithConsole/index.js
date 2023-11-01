const { app, BrowserWindow, ipcMain, Menu } = require('electron');
// const delay = require('delay');
const { SerialPort } = require('serialport');
const path = require('path');
const ipc = ipcMain;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = async () => {
  // general vars
  let localBuffer = [];

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  const menu = Menu.buildFromTemplate([
    {
      label: "Меню",
      submenu: [
        {
          click: () => mainWindow.webContents.send('update-counter', 1),
          label: 'Increment'
        },
        {
          click: () => mainWindow.webContents.send('update-counter', -1),
          label: 'Decrement'
        },
        {
          click: () => {
            localBuffer = [];
          },
          label: 'Clear'
        }
      ]
    }

  ]);

  Menu.setApplicationMenu(menu);

  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    localBuffer = [];
    // String
    comport.write(title, (er) => {
      if(er) {
        return console.log('Error on write: ', er.message)
      }
      console.log('Message written');
    })

  });

  ipcMain.on('counter-value', (_event, value) => {
    console.log(value) // will print value to Node console
  });

  ipcMain.on('get-port', () => {
    const portsAr = [];
    SerialPort.list().then(ports => {
      ports.forEach((port) => {
        portsAr.push(port.path);
      });
      mainWindow.webContents.send('get-port-res', portsAr);

    });
  })

  let comport;
  ipcMain.on('connect2port', (event, port) => {
    if (comport) {
      console.log("close comport"+comport)
      comport.close()
    }

    console.log(port)
    const {value, port_baudrate_value} = port;
    console.log(`value ${value}  port_baudrate_value ${port_baudrate_value}`)
    comport = new SerialPort({
      path: value,
      baudRate: port_baudrate_value,
    })

    comport.on('error', (er) => {
      // console.log(er.message)
      mainWindow.webContents.send('open-port-error', {msg: er.message, from: 'error'})
    })
   

    comport.open((er) => {
      if(er.message != 'Port is opening') {
        // console.log('Error opening port: ', er.message);
        mainWindow.webContents.send('open-port-error', {msg: er.message, from: 'open'});
      }

      mainWindow.webContents.send('open-port-success');
      // console.log('Success open port');
    })

    let timerId;
    function alarmModbusMessage() {
      timerId = null;
      mainWindow.webContents.send('serial-update', localBuffer);
    };

    
    comport.on('readable', async () => {
      console.log('GET')
      if(timerId) {
        clearTimeout(timerId);
      }
      const data = comport.read();
      // console.log(new Date(), "Date: ", data);
      localBuffer.push(data);
      console.log("localBuffer: ", localBuffer);
      timerId = setTimeout(alarmModbusMessage, 10);
      
      // serial-update
      // await delay(10000);
    });

  })

  ipcMain.on('send-message', (event, msg) => {
    localBuffer = [];
    // Uint8Array
    comport.write(msg, (er) => {
      if(er) {
        return console.log('Error on write: ', er.message)
      }
      console.log('Message written');
    })
  })

  ipcMain.on('disconnectFromPort', () => {
    comport.close();
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();


  // Work with serial port
  const dataBuffer = [];
  let mainPort;

  const portsAr = [];
  // SerialPort.list().then(ports => {
  //   ports.forEach((port) => {
  //     console.log(port.path);
  //     portsAr.push(port.path);
  //   });

  //   mainPort = new SerialPort({
  //     path: portsAr[1],
  //     baudRate: 115200,
  //   })
    
  //   mainPort.open((er) => {
  //     if(er.message != 'Port is opening') {
  //       console.log('Error opening port: ', er.message);
  //     }
  //     console.log('Success open port');
  //   });

    
  //   mainPort.on('readable', async () => {
  //     const data = mainPort.read().toString();
  //     // console.log(new Date(), "Date: ", data);
  //     localBuffer.push(data);
  //     console.log("localBuffer: ", localBuffer);

  //     mainWindow.webContents.send('serial-update', localBuffer);
  //     // serial-update
  //     // await delay(10000);
  //   });
    
  // });

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



