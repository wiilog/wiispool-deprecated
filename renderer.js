//dans le périmètre renderer
const $ = require('jquery');
const {ipcRenderer, app} = require('electron'); // import des modules electron
const ptp = require('pdf-to-printer'); // besoin de pdf-to-printer
const jsonfile = require('jsonfile')
const {dir} = require('console');
const conffile = 'configuration.json';
const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');
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
let confparam;
if (!JSON.parse(fs.readFileSync(path.join(__dirname, conffile)).toString())){
     confparam = {
        printer: '',
        dirtowatch: null,
        attrtoprinter: [],
    };
} else {
    confparam = JSON.parse(fs.readFileSync(path.join(__dirname, conffile)).toString());
}

jsonfile.readFile(path.join(__dirname, conffile), function (err, obj) {
    $('#disable').attr('disabled', obj.dirtowatch === null || obj.dirtowatch === undefined);
    if (err) {
        //get the default printer
        ptp.getDefaultPrinter().then(function (value) {
            confparam.printer = value.deviceId
        })
        updateSelectPrinter(confparam.printer)
        //set the default path to watch
        // le dirwath par défaut est le rep de téléchargement de l'utilisateur connecté
    }
    //if no error
    if (obj?.printer !== undefined) {
        confparam.printer = obj.printer
        updateSelectPrinter(confparam.printer);
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
            fs.unlink(filepath,function(err){
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
// let defaultdirectory = confparam.dirtowatch ?? app.getPath('downloads');

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

function clearInputValues() {
    document.querySelectorAll('input').forEach((input) => {
        $(input).val('');
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

        openModaleNewPrefix.addClass("d-none")
        disable.className = "btn disabled"
        disable.innerText = "Impression en cours"
        information.innerHTML = '<br> Depuis : <br>' + confparam.dirtowatch
        enableWatchDirectory(confparam.dirtowatch);
    })
});

btndirtowatch.addEventListener('click', (event) => {
    ipcRenderer.invoke('ipcSelectdir', 'test').then((result) => {
        if (result !== undefined) {
            confparam.dirtowatch = result;
        }
        $('#disable').attr('disabled', confparam.dirtowatch === undefined || confparam.dirtowatch === null);
        jsonfile.writeFile(path.join(__dirname, conffile), confparam);
        dirToWatchLabelDiv.text(confparam.dirtowatch);
    })
});

btnaddassociation.addEventListener('click', (event) => {
    const prefix = $('#prefixName').val();
    if (prefix) {
        const printer = $('#printerlistid').val();
        if (confparam.attrtoprinter === undefined) {
            confparam.attrtoprinter = [{'prefix': prefix, "printer": printer}];
            fs.writeFile(path.join(__dirname, conffile), JSON.stringify(confparam), () => {
            });
        } else {
            const uniquePrefix = confparam.attrtoprinter.map(object => object.prefix).indexOf(prefix) === -1;
            if (uniquePrefix) {
                let oldassoc = [confparam.attrtoprinter] ?? [];
                let newassoc = [{'prefix': prefix, "printer": printer}];
                let assoc = newassoc.concat(oldassoc).flat();
                for (const key in assoc) {
                    if (assoc[key] === null) {
                        delete assoc[key];
                    }
                }
                confparam.attrtoprinter = assoc;
                fs.writeFile(path.join(__dirname, conffile), JSON.stringify(confparam), () => {
                });
                confparam.attrtoprinter.forEach(({prefix, printer, id}) => {
                    $("#prefix-liste").append(`
            <tr>
                <td>${prefix}</td>
                <td>${printer}</td>
                <td class="trash-logo delete-assoc" data-id="${prefix}"></td>
                <td class="edit-logo edit-assoc" data-id="${prefix}"></td>
            </tr>
        `);
                });

                clearInputValues();
                $('#modalPrefix').removeClass('open');
                $('#disable').removeClass('d-none') ;
            } else {
                $('#errorMsg').text('Le prefixe : ' + prefix + ' est déja associé');
            }
        }
    } else {
        $('#errorMsg').text('Le prefixe doit être renseigné');
    }
})

let confValue = JSON.parse(fs.readFileSync(path.join(__dirname, conffile)).toString());
dirToWatchLabelDiv.append(confValue.dirtowatch);
cancelAddPrefix.addEventListener('click', (event) => {
    clearInputValues();
    $('#modalPrefix').removeClass('open');
    $('#disable').removeClass('d-none') ;
});

addPrefix.addEventListener('click', (event) => {
    $('#modalPrefix').addClass('open');
    $('#disable').addClass('d-none') ;
});
