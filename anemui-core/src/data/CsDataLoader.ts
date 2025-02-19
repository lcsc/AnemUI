import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData,CsLatLongData, CsViewerData, CsTimesJsNamesTreeInfo, CsTimesJsNamesTime, CsTimesJsVarData, CsTimesJsVarValue } from "./CsDataTypes";
//import * as fd from "./fakedata";
import { TileArrayCB } from "./ChunkDownloader";
import { DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { BaseApp } from "../BaseApp";
import { extractValueChunkedFromT, extractDataChunkedFromT, extractValueChunkedFromXY } from "./ChunkDownloader";

export async function loadTimesJs(): Promise<CsTimesJsData> {
    let ret = new Promise<CsTimesJsData>((resolve, reject) => {
        downloadUrl("./times.json", (status: number, response) => {
            if (status == 200) {
                let parsedJson: any;
                try {
                    parsedJson = JSON.parse(new TextDecoder().decode(response as ArrayBuffer));
                    let data: CsTimesJsData={
                        //Geo Data
                        center : parsedJson.center,

                        //Text data for variables
                        varTitle : parsedJson.varTitle,
                        legendTitle : parsedJson.legendTitle,

                        //Data of variables
                        times : parsedJson.times,
                        varMin : parsedJson.varMin,
                        varMax : parsedJson.varMax,
                        minVal : parsedJson.minVal,
                        maxVal : parsedJson.maxVal,

                        //Data of chunks
                        portions : parsedJson.portions, // Suffix for the nc files
                        lonMin: parsedJson.lonMin, //Min value for longitude dimension
                        lonMax: parsedJson.lonMax, //Max value for longitude dimension
                        lonNum: parsedJson.lonNum, //Number of values for longitude dimension
                        latMin: parsedJson.latMin, //Min value for latitude dimension
                        latMax: parsedJson.latMax, //Max value for latitude dimension
                        latNum: parsedJson.latNum, //Number of values for latitude dimension
                        timeMin: parsedJson.timeMin, //Min value for time dimension
                        timeMax: parsedJson.timeMax, //Max value for time dimension
                        timeNum: parsedJson.timeNum, //Number of values for time dimension
                        varType: parsedJson.varType, //Type of variable as struct definition (e.g. "f" for "float") https://docs.python.org/3/library/struct.html#format-characters
                        offsetType: parsedJson.offsetType, // Type of offset as struct definition (e.g. "i" for "int") https://docs.python.org/3/library/struct.html#format-characters
                        sizeType: parsedJson.sizeType, // Type of size as struct definition (e.g. "i" for "int") https://docs.python.org/3/library/struct.html#format-characters
                        projection: parsedJson.projection, // Projection of the data
                    }
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            }
        })
    })

    return ret;
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

export async function loadRegionFeatures( region: string): Promise<GeoJSON.Feature[]> {
    let ret = new Promise<GeoJSON.Feature[]>((resolve, reject) => {
        downloadUrl("./data/poly_" + region + ".json", (status: number, response) => {
            if (status == 200) {
                let parsedJson: any;
                try {
                    let data = []  
                    parsedJson = JSON.parse(new TextDecoder().decode(response as ArrayBuffer));
                    if (Object.keys(parsedJson).length > 0) {
                        data = parsedJson.features
                    }
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            }
        })
    })
    return ret;
}

export async function loadGeoJsonData( region: string): Promise<any> {
    return fetch('./data/poly_' + region + '.json') 
    .then(response => response.json());
}