import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData,CsLatLongData, CsViewerData, CsTimesJsNamesTreeInfo, CsTimesJsNamesTime, CsTimesJsVarData, CsTimesJsVarValue } from "./CsDataTypes";
//import * as fd from "./fakedata";
import { TileArrayCB } from "./ChunkDownloader";
import { DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { BaseApp } from "../BaseApp";
import { extractValueChunkedFromT, extractDataChunkedFromT, extractValueChunkedFromXY } from "./ChunkDownloader";
import { dataSource } from '../Env';
import { openArray } from 'zarr';

async function loadTimesJson(): Promise<CsTimesJsData> {
    // Carga desde archivo NC (implementación actual)
    const response = await new Promise<ArrayBuffer>((resolve, reject) => {
        downloadUrl("./times.json", (status: number, response) => {
            if (status == 200) {
                resolve(response as ArrayBuffer);
            } else {
                reject(new Error(`Failed to download: status ${status}`));
            }
        });
    });
    const parsedJson = JSON.parse(new TextDecoder().decode(response));

    return {
        //Geo Data
        center: parsedJson.center,

        //Text data for variables
        varTitle: parsedJson.varTitle,
        legendTitle: parsedJson.legendTitle,

        //Data of variables
        times: parsedJson.times,
        varMin: parsedJson.varMin,
        varMax: parsedJson.varMax,
        minVal: parsedJson.minVal,
        maxVal: parsedJson.maxVal,

        //Data of chunks
        portions: parsedJson.portions,
        lonMin: parsedJson.lonMin,
        lonMax: parsedJson.lonMax,
        lonNum: parsedJson.lonNum,
        latMin: parsedJson.latMin,
        latMax: parsedJson.latMax,
        latNum: parsedJson.latNum,
        timeMin: parsedJson.timeMin,
        timeMax: parsedJson.timeMax,
        timeNum: parsedJson.timeNum,
        varType: parsedJson.varType,
        offsetType: parsedJson.offsetType,
        sizeType: parsedJson.sizeType,
        projection: parsedJson.projection,
    };
}

async function loadZarrMetadata(zarrPath: string): Promise<CsTimesJsData> {
    let result: CsTimesJsData = {} as CsTimesJsData;

    // Geo Data
    result.center = {"lat":40.0911,"lng":-2.6224};

    // Text data for variables
    result.varTitle = {"NDVI":"Normalized Difference Vegetation Index","KNDVI":"Kernel Normalized Difference Vegetation Index","SNDVI":"Standardized Normalized Difference Vegetation Index","SKNDVI":"Standardized Kernel Normalized Difference Vegetation Index"};
    result.legendTitle = {"NDVI":"NDVI","KNDVI":"KNDVI","SNDVI":"SNDVI","SKNDVI":"SKNDVI"};

    // Data of variables
    result.times = {"KNDVI":["1981-07-01","1981-07-15","1981-08-01","1981-08-15","1981-09-01","1981-09-15","1981-10-01","1981-10-15","1981-11-01","1981-11-15","1981-12-01","1981-12-15","1982-01-01","1982-01-15","1982-02-01","1982-02-15","1982-03-01","1982-03-15","1982-04-01","1982-04-15","1982-05-01","1982-05-15","1982-06-01","1982-06-15"],"NDVI":["1981-07-01","1981-07-15","1981-08-01","1981-08-15","1981-09-01","1981-09-15","1981-10-01","1981-10-15","1981-11-01","1981-11-15","1981-12-01","1981-12-15","1982-01-01","1982-01-15","1982-02-01","1982-02-15","1982-03-01","1982-03-15","1982-04-01","1982-04-15","1982-05-01","1982-05-15","1982-06-01","1982-06-15"],"SKNDVI":["1981-07-01","1981-07-15","1981-08-01","1981-08-15","1981-09-01","1981-09-15","1981-10-01","1981-10-15","1981-11-01","1981-11-15","1981-12-01","1981-12-15","1982-01-01","1982-01-15","1982-02-01","1982-02-15","1982-03-01","1982-03-15","1982-04-01","1982-04-15","1982-05-01","1982-05-15","1982-06-01","1982-06-15"],"SNDVI":["1981-07-01","1981-07-15","1981-08-01","1981-08-15","1981-09-01","1981-09-15","1981-10-01","1981-10-15","1981-11-01","1981-11-15","1981-12-01","1981-12-15","1982-01-01","1982-01-15","1982-02-01","1982-02-15","1982-03-01","1982-03-15","1982-04-01","1982-04-15","1982-05-01","1982-05-15","1982-06-01","1982-06-15"]};
    result.varMin = {"KNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"NDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"SKNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"SNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]};
    result.varMax = {"KNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"NDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"SKNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"SNDVI":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]};
    result.minVal = {"KNDVI":-1,"NDVI":-1,"SKNDVI":-1,"SNDVI":-1};
    result.maxVal = {"KNDVI":-1,"NDVI":-1,"SKNDVI":-1,"SNDVI":-1};

    // Data of chunks
    result.portions = {"KNDVI":["_all"],"NDVI":["_all"],"SKNDVI":["_all"],"SNDVI":["_all"]};  // No se usa con Zarr
    result.lonMin = {"KNDVI_all":-80400,"NDVI_all":-80400,"SKNDVI_all":-80400,"SNDVI_all":-80400};
    result.lonMax = {"KNDVI_all":1145000,"NDVI_all":1145000,"SKNDVI_all":1145000,"SNDVI_all":1145000};
    result.lonNum = {"KNDVI_all":1115,"NDVI_all":1115,"SKNDVI_all":1115,"SNDVI_all":1115};
    result.latMin = {"KNDVI_all":3980000,"NDVI_all":3980000,"SKNDVI_all":3980000,"SNDVI_all":3980000};
    result.latMax = {"KNDVI_all":4896300,"NDVI_all":4896300,"SKNDVI_all":4896300,"SNDVI_all":4896300};
    result.latNum = {"KNDVI_all":834,"NDVI_all":834,"SKNDVI_all":834,"SNDVI_all":834};
    result.timeMin = undefined;  // No se usa
    result.timeMax = undefined;  // No se usa
    result.timeNum = undefined;  // No se usa
    result.varType = 'f';  // asumimos float por defecto
    result.offsetType = 'Q';
    result.sizeType = 'I';
    result.projection = "EPSG:23030";

    return result;
}

export async function loadTimesJs(): Promise<CsTimesJsData> {
    if (dataSource === 'nc') {
        // Carga desde NetCDF
        return await loadTimesJson();
    } else {
        // Carga desde Zarr
        return await loadZarrMetadata(dataSource);
    }
}

function degrees2meters(lon:number, lat:number):[number,number] {
    var x = lon * 20037508.343 / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.343 / 180;
    return [x, y]
}


export async function loadLatLongData(latLng:CsLatLong,appStatus:CsViewerData,timejs:CsTimesJsData):Promise<CsLatLongData>{
    let ret = new Promise<CsLatLongData>((resolve, reject) => {
        let done:TileArrayCB=(value:number,values:number[])=>{
            let ret:CsLatLongData = {
                httpStatus:200,
                latlng:latLng,
                value:value,
                values:values
            }
            resolve(ret)
        }
        let fail:DownloadErrorCB=(status:number,error?:Error)=>{
            reject(status)
        }
        extractDataChunkedFromT(latLng, done, fail, appStatus,timejs, true);
    })

    return ret;
}

export async function loadLatLogValue(latLng:CsLatLong,appStatus:CsViewerData,timejs:CsTimesJsData,zoom:number):Promise<number> {
    /*var mousemoveValue = function(coor){
        // if(coor > -1.E-37){
        if(typeof coor == "string" | coor > minimumvalue){
          popup = L.popup({autoPan:false,
            closeButton:false,
            autoClose:true,
            className:'custom'
          })
          .setLatLng(event.latlng)
          .setContent(valueText + coor)
          .openOn(map);
        };
      };*/

    let ret = new Promise<number>((resolve, reject) => {
        let done:TileArrayCB=(value:number,values:number[])=>{
            resolve(value)
        }
        let fail:DownloadErrorCB=(status:number,error?:Error)=>{
            reject(status)
        }

        //console.log("Test T-XY")
        extractValueChunkedFromXY(latLng, done, fail, appStatus,timejs, false);
    });
    return ret
}
/*
function extractValueChunkedFromTXY(latlng: CsLatLong, functionValue: TileArrayCB, errorCb: DownloadErrorCB, status: CsViewerData, times: CsTimesJsData, int: boolean = false){
    extractValueChunkedFromXY(latlng,(value:number,values:number[])=>{console.log("XY: => "+value);functionValue(value,values)},errorCb,status,times,int);
    extractValueChunkedFromT(latlng,(value:number,values:number[])=>{console.log(" T: => "+value);},errorCb,status,times,int);
}*/
