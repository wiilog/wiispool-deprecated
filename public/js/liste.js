const $ = require('jquery');
const path = require('path');
const fs = require('fs');
const ptp = require("pdf-to-printer");
const jsonfile = require("jsonfile");
const conffile = 'configuration.json'
let confparam = JSON.parse(fs.readFileSync(path.join(__dirname, conffile)).toString());
const $modalEditAssociation = $('.modal-edit-association');
let divprinterlist = $('#printerlistid');

$(function () {
    refreshList();
    $(document).on(`click`, `.delete-assoc`, function () {
        const currentPrefix = $(this).data(`id`).toString();
        const index = confparam.attrtoprinter.findIndex(({prefix}) => currentPrefix === prefix);
        confparam.attrtoprinter.splice(index, 1);
        fs.writeFile(path.join(__dirname, conffile), JSON.stringify(confparam), () => {
            window.alert(`L'association a bien été supprimée.`);
            refreshList();
        });
    });

    $(document).on(`click`, `.edit-assoc`, function () {
        const currentPrefix = $(this).data(`id`).toString();
        $('table').addClass('d-none');
        $modalEditAssociation.addClass('open');
        const index = confparam.attrtoprinter.findIndex(({prefix}) => currentPrefix === prefix);
        const {prefix, printer} = confparam.attrtoprinter[index];
        $modalEditAssociation.find(`[name=prefixName]`).val(confparam.attrtoprinter[index].prefix);
        $modalEditAssociation.find(`#printerlistid`).val(printer);
        $modalEditAssociation.find(`#hiddenPrefix`).val(prefix);
        $modalEditAssociation.find(`#prefixToEdit`).val(prefix);
        updateSelectPrinter(printer);
    });

    $(document).on(`click`, `#canceleditprefix`, function () {
        $('table').removeClass('d-none');
        $modalEditAssociation.removeClass('open');
        refreshList();
    });

    $(document).on(`click`, `#attrtoprntedit`, function () {
        const prefix = $('#editprefix').val();
        const prefixToEdit = $('#prefixToEdit').val();
        const index = confparam.attrtoprinter.map(object => object.prefix).indexOf(prefixToEdit);
        const printer = $('#printerlistid').val();
        if (prefix === prefixToEdit) {
            confparam.attrtoprinter[index].printer = printer;
            fs.writeFile(path.join(__dirname, conffile), JSON.stringify(confparam), () => {
                $('table').removeClass('d-none');
                $modalEditAssociation.removeClass('open');
                refreshList();
            });
        } else {
            if (prefix !== '') {
                const checkUniqueIndex = confparam.attrtoprinter.map(object => object.prefix).indexOf(prefix);
                if (checkUniqueIndex < 0) {
                    confparam.attrtoprinter[index].printer = printer;
                    confparam.attrtoprinter[index].prefix = prefix;
                    fs.writeFile(path.join(__dirname, conffile), JSON.stringify(confparam), () => {
                        $('table').removeClass('d-none');
                        $modalEditAssociation.removeClass('open');
                        refreshList();
                    });
                } else {
                    $('#errorMsg').text('Le prefixe : ' + prefix + ' est déja associé');
                }
            } else {
                $('#errorMsg').text('Le prefixe ne peut pas être vide');
            }
        }
    });
});

function refreshList() {
    $('#prefix-liste').empty();
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
}

function updateSelectPrinter(printerselected) {
//essai de récup les imprimantes
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
        divprinterlist.append(allprinterhtml);
        allprinterhtml = ''
    })
}
