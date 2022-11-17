//dans le périmètre renderer
const $ = require('jquery');
const {ipcRenderer, dialog, app} = require("electron"); // import des modules electron
const ptp = require("pdf-to-printer"); // besoin de pdf-to-printer
const jsonfile = require('jsonfile')
const {dir} = require('console');
const conffile = 'configuration.json';
const fs = require('fs');
const chokidar = require('chokidar');
const path = require("path");
//Sélecteur CSS sur index.html
let disable = document.getElementById('disable');
let printerform =$('#printerselectform');
let printerform2 = $('#printerselectform2');
let btndirtowatch = document.getElementById('btnselectdirtowatch');
let selectdirectorytowatchform = $('#selectdirectorytowatch');
let divprinterlist = $('#printerlistid');
let information = $('#informations');
let addPrefix = document.getElementById('openModaleNewPrefix');
let cancelAddPrefix = document.getElementById('canceladdprefix');
let btnaddassociation = document.getElementById('attrtoprnt');
let dirToWatchLabelDiv = $('#dirWatch');
let openModaleNewPrefix = $('#openModaleNewPrefix');
// const $dirWatch = $('#dirWatch');
let confparam = {
    printer: '',
    dirtowatch: dir,
    attrtoprinter: [],
};
jsonfile.readFile(conffile, function (err, obj) {
    if (err) {
        //get the default printer
        ptp.getDefaultPrinter().then(function (value) {
            confparam.printer = value.deviceId
        })
        updateSelectPrinter(confparam.printer)
        //set the default path to watch
        // le dirwath par défaut est le rep de téléchargement de l'utilisateur connecté
        confparam.dirtowatch = defaultdirectory
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

function moveFileAndPrintPdf(oldpath) {
    // mapper configuration.json pour creer  [perfixes: printer]
    // (if) some le tableau de prefix () => oldpath include this
    //  (then) find l'association dans confparma.attrtoprinter
    const filePrefix = oldpath.split(`_`)[0];
    const prefixArray = filePrefix.split("\\");
    const prefix = prefixArray[prefixArray.length - 1];
    const index = confparam.attrtoprinter.map(object => object.prefix).indexOf(prefix);
    if (index > -1) {
        //set the new filepath
        ipcRenderer.invoke('read-user-data', oldpath).then()
        fs.rename(oldpath, oldpath, function (err) {
                if (err) {
                    throw err;
                } else {
                    //set printer
                    let optionsimpression = {
                        printer: confparam.attrtoprinter[index].printer,
                        win32: []
                    }
                    //run print
                    ptp.print(oldpath, optionsimpression).then( () =>
                        deleteFile(oldpath)
                    )
                }
            }
        );
    }
}

function deleteFile(filepath){
    fs.exists(filepath, function(exists) {
        if(exists) {
            // File exists deletings
            fs.unlink(path.join(__dirname, conffile),function(err){
                if(err){
                    alert("An error ocurred updating the file"+ err.message);
                    return;
                }
            });
        } else {
            alert("This file doesn't exist, cannot delete");
        }
    });
}
// récupération du rep dirwatcher defaut
let defaultdirectory = confparam.dirtowatch ?? app.getPath('downloads');

function updateSelectPrinter(printerselected) {
//essai de récup les imprimantes depuis renderer
    let myprinterstab = []
    ptp.getPrinters().then(function (value) {
        let allprinterhtml = ''
        let x
        for (x in value) {
            myprinterstab.push(value[x]['deviceId'])
            if (value[x]['deviceId'] == printerselected) {
                allprinterhtml += `<option selected="selected">${value[x]['deviceId']}</option>`
            } else {
                allprinterhtml += `<option>${value[x]['deviceId']}</option>`
            }
        }
        divprinterlist.html(allprinterhtml);
        allprinterhtml = ''
    })
}

function clear() {
    document.querySelectorAll('input').forEach((input) => {
        $(input).val('');
    })
}

// lecture du fichier de conf
conFfile = jsonfile.readFile(conffile, function (err, obj) {
    if (err) {
        //get the default printer
        ptp.getDefaultPrinter().then(function (value) {
            confparam.printer = value.deviceId
        })
        updateSelectPrinter(confparam.printer)
        //set the default path to watch
        // le dirwath par défaut est le rep de téléchargement de l'utilisateur connecté
        confparam.dirtowatch = defaultdirectory
    }
    //if no error
    if (obj?.printer !== undefined) {
        confparam.printer = obj.printer
        updateSelectPrinter(obj.printer)
    }
    if (obj?.dirtowatch !== undefined) {
        confparam.dirtowatch = obj.dirtowatch
    }
    if (obj?.attrtoprinter !== undefined) {
        confparam.attrtoprinter = obj.attrtoprinter
    }
    divprinterlist.val(confparam.printer);

});

function readconfFile() {
    return jsonfile.readFile('configuration.json', function (err, obj) {
        if (err) {
            //get the default printer
            ptp.getDefaultPrinter().then(function (value) {
                confparam.printer = value.deviceId
            })
            updateSelectPrinter(confparam.printer)
            //set the default path to watch
            // le dirwath par défaut est le rep de téléchargement de l'utilisateur connecté
            confparam.dirtowatch = defaultdirectory
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
}

function enableWatchDirectory(directory, printer){
    defaultprinter = printer
    dirwatcher = chokidar.watch(directory, {ignored: /^\./, persistent: true})
    dirwatcher.on('add', path => moveFileAndPrintPdf(path));
    return true
}

let dirtowatchstring = confparam.dirtowatch;
disable.addEventListener('click', (event) => {
    //change class to btn loading
    disable.className = "btn loading"
    //on cache le formulaire
    printerform.className = "d-none"
    selectdirectorytowatchform.className = "d-none"
    ipcRenderer.invoke('ipcRwritefile', confparam.dirtowatch).then((result) => {
        //dialog.showErrorBox(result, result)

        // enableWatchDirectory(confparam.dirtowatch);
        openModaleNewPrefix.addClass("d-none")
        disable.className = "btn disabled"
        disable.innerText = "Impression en cours"
        information.innerHTML = '<br> Depuis : <br>' + confparam.dirtowatch
        enableWatchDirectory(confparam.dirtowatch);
    })
});

btndirtowatch.addEventListener('click', (event) => {
    ipcRenderer.invoke('ipcSelectdir', 'test').then((result) => {
        confparam.dirtowatch = result;
        jsonfile.writeFile(conffile, confparam);
        dirToWatchLabelDiv.text(confparam.dirtowatch);
    })
});

btnaddassociation.addEventListener('click', (event) => {
    const prefix = $('#prefixName').val();
    if (prefix) {
        const printer = $('#printerlistid').val();
        console.log(confparam)
        const uniquePrefix = confparam.attrtoprinter.map(object => object.prefix).indexOf(prefix) === -1;
        if (uniquePrefix) {
            let oldassoc = [confparam.attrtoprinter] ?? [];
            let newassoc = [{'prefix': prefix, "printer": printer}];
            let assoc = newassoc.concat(oldassoc).flat();
            for (const key in assoc) {
                if (assoc[key] === undefined) {
                    delete assoc[key];
                }
            }
            confparam.attrtoprinter = assoc;
            jsonfile.writeFile(conffile, confparam);
            clear();
            $('#modalPrefix').removeClass('open');
        } else {
            $('#errorMsg').text('Le prefixe : ' + prefix + ' est déja associé');
        }
    } else {
        $('#errorMsg').text('Le prefixe doit être renseigné');
    }
})

let confValue = JSON.parse(fs.readFileSync(path.join(__dirname, conffile)).toString());
dirToWatchLabelDiv.append(confValue.dirtowatch);
cancelAddPrefix.addEventListener('click', (event) => {
    clear();
    $('#modalPrefix').removeClass('open');
});

addPrefix.addEventListener('click', (event) => {
    $('#modalPrefix').addClass('open');
});
