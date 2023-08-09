const {$, document} = require('jquery');
const {ipcMain, dialog, app, BrowserWindow, Menu, electron} = require('electron'); // import des modules electron
const fs = require('fs'); // besoin du module pour travailler sur les fichiers
const path = require('path'); // besoin du mobule path
const ptp = require("pdf-to-printer"); // besoin de pdf-to-printer
const chokidar = require('chokidar');
const {dir} = require("console");
const jsonFile = require("jsonfile");
const confFile = 'configuration.json';
const menu = Menu.buildFromTemplate([
    {
        label: "Accueil",
        click: () => {
            win.loadFile('index.html');
        }
    },
    {
        label: "Liste attributs",
        click: () => {
            win.loadFile('liste.html');
        }
    },
    {
        label: "Zoom",
        submenu: [
            {
                label: "Zoom +",
                click: () => {
                    const contents = win.webContents;
                    const level = contents.getZoomLevel();
                    contents.setZoomLevel(level + 0.5);
                },
                accelerator: "CmdOrCtrl+numadd"
            },
            {
                label: "Zoom -",
                click: () => {
                    const contents = win.webContents;
                    const level = contents.getZoomLevel();
                    contents.setZoomLevel(level - 0.5);
                },
                accelerator: "CmdOrCtrl+numsub"
            },
            {
                type: "separator"
            },
            {
                label: "Normal",
                click: () => {
                    const contents = win.webContents;
                    contents.setZoomLevel(0);
                },
                accelerator: "CmdOrCtrl+num0"
            }
        ]
    },
    {
        label: "A propos",
        click: () => {
            win.loadFile('about.html');
        }
    },
    {
        label: "Quit",
        submenu: [
            {
                label: "EXIT",
                click: () => {
                    app.quit();
                },
                accelerator: "Alt+F4"
            },
        ]
    }
]);
let confparam = {
    printer: '',
    dirtowatch: app.getPath('downloads'),
    attrtoprinter : undefined,
};
let dirwatcher = confparam.dirtowatch ?? app.getPath('downloads');
let printers = '';
let defaultprinter = '';
let win;

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent(app)) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}
jsonFile.readFile(confFile, function (err, obj) {
    if (err) {
        //get the default printer
        ptp.getDefaultPrinter().then(function (value) {
            confparam.printer = value.deviceId
        })
        updateSelectPrinter(confparam.printer)
    }
    //if no error
    if (obj?.printer !== undefined) {
        confparam.printer = obj.printer
    }
    if (obj?.dirtowatch !== undefined) {
        confparam.dirtowatch = obj.dirtowatch
    }
    if (obj?.attrtoprinter !== undefined) {
        confparam.attrtoprinter = obj.attrtoprinter
    }
})

Menu.setApplicationMenu(menu);
//get all printers of OS
ptp.getPrinters().then((value) => {
  printers = value;
})

ipcMain.handle('read-user-data', async (event, fileName) => {
    const path = electron.app.getPath('userData');
    return await fs.promises.readFile(path.join(__dirname, confFile));
})
//definition d'une fenetre
function createWindow() {
    win = new BrowserWindow({
        width: 500,
        height: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
        resizable: true,
        minimizable: true,
        maximizable: true,
        autoHideMenuBar: false
    })

    win.loadFile('index.html')
    //ouverture de la console chrome
    win.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()
    //On pourrait positionner ici la suppression de tous les PDF sur APPDATA Windows

    //envoi d'une variable
    ipcMain.on('synchronous-message', (event, arg) => {
      event.returnValue = app.getPath("downloads")
    })
})

//si toutes les fenetres sont fermées, on ferme l'application
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
  
  // Processus principal
ipcMain.handle('ipcRwritefile', async (event, directory) => {
  //result = writeFile(someArgument)
  //impressionPDF()
  enableWatchDirectory(directory)
  //return 'ok'
})
function enableWatchDirectory(directory, printer){
    defaultprinter = printer
    dirwatcher = chokidar.watch(directory, {ignored: /^\./, persistent: true})
    return true
}
//event sur bouton selectdirtowatch 
ipcMain.handle('ipcSelectdir', async (event, someArgument) => {
  const watchdirectory = await dialog.showOpenDialog({properties : ['openDirectory']}).then(result => {
    dirwatcher = result.filePaths[0]
    event.returnValue = result.filePaths[0]
    return result.filePaths[0]
  }).catch(err => {
    //on ne fait rien
  })
  return watchdirectory
})

ipcMain.handle('ipcInputAttr', async (event, someArgument) => {
    return document.getElementById('#prefixName').val()
})

function handleSquirrelEvent(application) {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true
      });
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      application.quit();
      return true;
  }
}

  
  