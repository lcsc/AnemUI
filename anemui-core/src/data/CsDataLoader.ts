import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData,CsLatLongData, CsViewerData, CsTimesJsNamesTreeInfo, CsTimesJsNamesTime, CsTimesJsVarData, CsTimesJsVarValue } from "./CsDataTypes";
//import * as fd from "./fakedata";
import { TileArrayCB } from "./ChunkDownloader";
import { DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { BaseApp } from "../BaseApp";
import { extractValueChunkedFromT, extractDataChunkedFromT, extractValueChunkedFromXY } from "./ChunkDownloader";
import { dataSource } from '../Env';
import { NestedArray, openArray, openGroup, TypedArray } from 'zarr';
import { timeDim, horDim, verDim, singlePortion } from "./CsPConstans";

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

export function isNestedArray(value: number | NestedArray<TypedArray>): value is NestedArray<TypedArray> {
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
    result.minVal = {};
    result.maxVal = {};
    result.portions = {};
    result.lonMin = {};
    result.lonMax = {};
    result.lonNum = {};
    result.latMin = {};
    result.latMax = {};
    result.latNum = {};

    let lastProjection: string = "";

    for (const varName of groups) {
        const varNamePortion = varName + singlePortion;
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

        // minVal and maxVal
        result.minVal[varName] = var_group_attrs["minVal"];
        result.maxVal[varName] = var_group_attrs["maxVal"];

        // portions
        result.portions[varName] = [singlePortion];    // Not used with Zarr => A fixed unique value is given

        // lonMin, lonMax and lonNum
        const lons = await openArray({store: zarrBasePath, path: varName+"/"+horDim, mode: "r"});
        const lonsData = await lons.get();
        if (isNestedArray(lonsData)) {
            const lonsTypedArray = lonsData.data as TypedArray;
            result.lonMin[varNamePortion] = lonsTypedArray[0];
            result.lonMax[varNamePortion] = lonsTypedArray[lonsTypedArray.length - 1];
            result.lonNum[varNamePortion] = lonsTypedArray.length;
        } else {
            result.lonMin[varNamePortion] = lonsData;
            result.lonMax[varNamePortion] = lonsData;
            result.lonNum[varNamePortion] = 1;
        }

        // latMin, latMax and latNum
        const lats = await openArray({store: zarrBasePath, path: varName+"/"+verDim, mode: "r"});
        const latsData = await lats.get();
        if (isNestedArray(latsData)) {
            const latsTypedArray = latsData.data as TypedArray;
            result.latMin[varNamePortion] = latsTypedArray[0];
            result.latMax[varNamePortion] = latsTypedArray[latsTypedArray.length - 1];
            result.latNum[varNamePortion] = latsTypedArray.length;
        } else {
            result.latMin[varNamePortion] = latsData;
            result.latMax[varNamePortion] = latsData;
            result.latNum[varNamePortion] = 1;
        }

        lastProjection = var_group_attrs["projection"];
    }

    // Data of chunks
    result.timeMin = undefined; // Not used
    result.timeMax = undefined; // Not used
    result.timeNum = undefined; // Not used
    result.varType = 'f';       // Not used with Zarr
    result.offsetType = 'Q';    // Not used with Zarr => A fixed unique value is given
    result.sizeType = 'I';      // Not used with Zarr => A fixed unique value is given
    result.projection = lastProjection;

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