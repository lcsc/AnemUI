import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData,CsLatLongData, CsViewerData, CsTimesJsNamesTreeInfo, CsTimesJsNamesTime, CsTimesJsVarData, CsTimesJsVarValue } from "./CsDataTypes";
//import * as fd from "./fakedata";
import { TileArrayCB } from "./ChunkDownloader";
import { DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { BaseApp } from "../BaseApp";
import { extractValueChunkedFromT, extractDataChunkedFromT, extractValueChunkedFromXY } from "./ChunkDownloader";
import { dataSource } from '../Env';
import { NestedArray, openArray, openGroup, TypedArray } from 'zarr';
import { timeDim, horDim, verDim } from "./CsPConstans";

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

function isNestedArray(value: number | NestedArray<TypedArray>): value is NestedArray<TypedArray> {
    return typeof value !== 'number';
}

async function loadTimesZarr(): Promise<CsTimesJsData> {
    let result: CsTimesJsData = {} as CsTimesJsData;

    const zarrBasePath = window.location.origin + '/zarr';
    const root_group = await openGroup(zarrBasePath);
    const root_group_attrs = await root_group.attrs.asObject();
    const groups = root_group_attrs.variables;
    const converters: { [unit: string]: (d: number) => string } = {
        "days since 1970-01-01": (d) =>
            new Date(Date.UTC(1970, 0, 1) + d * 86400000).toISOString().split("T")[0],
        "days since 1961-01-01": (d) =>
            new Date(Date.UTC(1961, 0, 1) + d * 86400000).toISOString().split("T")[0],
        "years since 1961-01-01": (d) => {
            const date = new Date(Date.UTC(1961, 0, 1));
            date.setUTCFullYear(date.getUTCFullYear() + d);
            return date.toISOString().split("T")[0];
        },
        "days since 1961-01-01 12:00:00 GMT": (d) =>
            new Date(Date.UTC(1961, 0, 1, 12) + d * 86400000).toISOString().split("T")[0],
        "days since 1970-01-01 00:00:00 CET": (d) =>
            new Date(Date.UTC(1969, 11, 31, 23) + d * 86400000).toISOString().split("T")[0],
        "months since 1979-12": (d) => {
            const date = new Date(Date.UTC(1979, 11, 1));
            date.setUTCMonth(date.getUTCMonth() + d);
            return date.toISOString().split("T")[0];
        },
    };

    // Geo Data
    result.center = {"lat":root_group_attrs.center_lat, "lng":root_group_attrs.center_lon};

    result.varTitle = {};
    result.legendTitle = {};
    result.times = {};
    result.varMin = {};
    result.varMax = {};
    for (const varName of groups) {
        const var_group = await openGroup(zarrBasePath + "/" + varName);
        const var_group_attrs = await var_group.attrs.asObject();

        // varTitle and legendTitle
        result.varTitle[varName] = var_group_attrs["varTitle"];
        result.legendTitle[varName] = var_group_attrs["legendTitle"];

        // times
        const time_dim = await openArray({store: zarrBasePath, path: varName+"/"+timeDim, mode: "r"});
        const time_dim_attrs = await time_dim.attrs.asObject();
        const timeData = await time_dim.get();

        if (isNestedArray(timeData)) {
            const typedArray = timeData.data as TypedArray;
            const timeArr = Array.from(typedArray);
            let converted: string[];

            if (converters[time_dim_attrs.units]) {
                converted = timeArr.map(converters[time_dim_attrs.units]);
            } else {
                console.error("Unsupported time units: " + time_dim_attrs.units);
                converted = timeArr.map(String);
            }
            result.times[varName] = converted;
        } else {
            result.times[varName] = [timeData.toString()];
        }

        // varMin
        const varMin = await openArray({store: zarrBasePath, path: varName+"/"+varName+"_min", mode: "r"});
        const minData = await varMin.get();
        if (isNestedArray(minData)) {
            const minTypedArray = minData.data as TypedArray;
            result.varMin[varName] = Array.from(minTypedArray);
        } else {
            result.varMin[varName] = [Number(minData)];
        }
        
        // varMax
        const varMax = await openArray({store: zarrBasePath, path: varName+"/"+varName+"_max", mode: "r"});
        const maxData = await varMax.get();
        if (isNestedArray(maxData)) {
            const maxTypedArray = maxData.data as TypedArray;
            result.varMax[varName] = Array.from(maxTypedArray);
        } else {
            result.varMax[varName] = [Number(maxData)];
        }
    }

    // Data of variables
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
    return dataSource === 'nc' ? loadTimesJson() : loadTimesZarr();
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
