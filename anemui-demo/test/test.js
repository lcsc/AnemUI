const csTest = require('common-test/test');

let test = new csTest;

const serviceCode   = "eto";
const serviceFolder = "evapotranspiration-monitor";
const serviceTitle  = "Monitor de Evapotranspiración de Referencia";
const dropDownId    = "VariableDD";
const dropDownVars  =  ["Evapotranspiración de Referencia","Incertidumbre","Componente Aerodinámico","Componente Radiativo"];

const params = {
    "serviceCode" : serviceCode,
    "serviceFolder" : serviceFolder,
    "serviceTitle" : serviceTitle,
    "dropDownId" : dropDownId,
    "dropDownVars" : dropDownVars
}

test.performTest(params);