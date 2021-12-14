//dans le périmètre renderer
const { ipcRenderer, dialog, app} = require('electron'); // import des modules electron
const ptp = require("pdf-to-printer"); // besoin de pdf-to-printer
const jsonfile = require('jsonfile')
const { dir } = require('console');

//Sélecteur CSS sur index.html
var disable = document.getElementById('disable')
var printerform = document.getElementById('printerselectform')
var printerform2 = document.getElementById('printerselectform2')
var btndirtowatch = document.getElementById('btnselectdirtowatch')
var selectdirectorytowatchform = document.getElementById('selectdirectorytowatch')
var divprinterlist = document.getElementById('printerlistid')
var information = document.getElementById('informations')

//récupération du rep dirwatcher defaut
var defaultdirectory = ipcRenderer.sendSync('synchronous-message', 'ping')

function updateSelectPrinter(printerselected){
//essai de récup les imprimantes depuis renderer
var myprinterstab = []
ptp.getPrinters().then(function(value){
  var allprinterhtml = ''
  var x 
  for(x in value){
    myprinterstab.push(value[x]['deviceId'])
    if (value[x]['deviceId'] == printerselected){
      allprinterhtml += `<option selected="selected">${value[x]['deviceId']}</option>`
    } else{
      allprinterhtml += `<option>${value[x]['deviceId']}</option>`
    }
  }
  divprinterlist.innerHTML = allprinterhtml
  allprinterhtml = ''
  
})
}

//le fichier de conf
const conffile = 'configuration.json'

//l'objet de conf
var confparam = {
  printer : '',
  dirtowatch : dir
}

//on lit le fichier de conf
jsonfile.readFile(conffile,function(err, obj) {
  if (err) {

    //get the default printer
    ptp.getDefaultPrinter().then(function(value){
      confparam.printer = value.deviceId
    })
    updateSelectPrinter(confparam.printer)
    //set the default path to watch
    confparam.dirtowatch = defaultdirectory
  }
  //if no error  
  if(obj?.printer !== undefined){
    confparam.printer = obj.printer
  }
  if(obj?.dirtowatch !== undefined){
    confparam.dirtowatch = obj.dirtowatch
  }
  divprinterlist.value = confparam.printer
  updateSelectPrinter(obj.printer)
})


disable.addEventListener('click', (event) => {
    //change class to btn loading
    disable.className = "btn loading"
    //on cache le formulaire
    printerform.className = "d-none"
    selectdirectorytowatchform.className = "d-none"
    ipcRenderer.invoke('ipcRwritefile', confparam.dirtowatch, confparam.printer).then((result) => {
        //dialog.showErrorBox(result, result)
        disable.className = "btn disabled"
        disable.innerText = "Impression en cours *ETQ*.pdf"
        information.innerHTML = 'Depuis : <br><br>'+confparam.dirtowatch+'<br><br> sur <br><br>'+confparam.printer
      })
})

btndirtowatch.addEventListener('click', (event) => {
    ipcRenderer.invoke('ipcSelectdir', 'test').then((result) => {  
      confparam.dirtowatch = result
      jsonfile.writeFile(conffile,confparam)
      })
})

//traitement de la réponse async sur le chemin
// Processus de rendu




//on change du sélect, renvoyer vers l'imprimante au main.
divprinterlist.addEventListener('change', (event) => {
  confparam.printer = event.target.value
  jsonfile.writeFile(conffile,confparam)
})




