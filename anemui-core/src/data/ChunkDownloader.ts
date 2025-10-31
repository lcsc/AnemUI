import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData, CsViewerData, Array4Portion } from "./CsDataTypes";
import { DownloadDoneCB, DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { renderers } from "./../tiles/Support";
import struct from './struct.mjs';
import { inflate } from 'pako';
import { parse } from 'csv-parse/sync';
import proj4 from 'proj4';
import { fromLonLat } from "ol/proj";
import { CategoryRangePainter, PaletteManager } from "../PaletteManager";
import { BaseApp } from "../BaseApp";
import Static from "ol/source/ImageStatic";
import { ncSignif, dataSource, computedDataTilesLayer, olProjection } from "../Env";
import * as fs from 'fs';
import * as path from 'path';
import { NestedArray, openArray, TypedArray } from 'zarr';
import { isNestedArray } from "./CsDataLoader";

export type ArrayDownloadDone = (data: number[]) => void;
export type DateDownloadDone = (dataUrl: string) => void;
export type CsvDownloadDone = (data: any, filename: string, type: string) => void;
export type TileArrayCB = (value: number, values: number[]) => void;

export const pxTransparent: number = 0x00FFFFFF;

function getActualTimeIndex(requestedTimeIndex: number, varName: string, timesJs: CsTimesJsData): number {
    const availableTimes = timesJs.times[varName];

    if (!availableTimes) {
        console.warn(`No time data available for variable ${varName}`);
        return 0;
    }

    if (typeof availableTimes === 'string') {
        return 0;
    }

    if (Array.isArray(availableTimes)) {
        if (availableTimes.length === 0) {
            console.warn(`Empty time array for variable ${varName}`);
            return 0;
        }

        // For single time step data, always use index 0
        if (availableTimes.length === 1) {
            return 0;
        }

        if (varName === 'ai_serie_anu' && requestedTimeIndex >= availableTimes.length - 3) {
            console.warn(`Adjusting time index for ${varName}: requested=${requestedTimeIndex}, using=${availableTimes.length - 4}`);
            return Math.max(0, availableTimes.length - 4);
        }

        // For multi-time data, validate the requested index
        if (requestedTimeIndex >= availableTimes.length) {
            console.warn(`Requested time index ${requestedTimeIndex} exceeds available data (max: ${availableTimes.length - 1}). Using last available index.`);
            return availableTimes.length - 1;
        }

        return Math.max(0, requestedTimeIndex);
    }

    console.warn(`Unexpected time data type for ${varName}, treating as single time`);
    return 0;
}

function isSingleTimeStep(varName: string, timesJs: CsTimesJsData): boolean {
    const availableTimes = timesJs.times[varName];
    return !availableTimes || availableTimes.length <= 1;
}

function zip<T, U>(a: T[], b: U[]): [T, U][] {
    return a.map((k, i) => [k, b[i]]);
}

export function browserDownloadFile(data: any, filename: string, type: string) {
    var file = new Blob([data], { type: type });
    var a = document.createElement("a"),
        url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

async function rangeRequest(url: string, startByte: bigint, endByte: bigint): Promise<Uint8Array> {
    const headers = new Headers();
    headers.append('Range', 'bytes=' + startByte + '-' + endByte);

    try {
        const response = await fetch(url, { headers: headers });
        if (response.status === 206) {
            return new Uint8Array(await response.arrayBuffer());
        } else if (response.status === 416) {
            console.error(`Range not satisfiable: requested bytes ${startByte}-${endByte} from ${url}`);
            throw new Error(`Range not satisfiable: requested bytes ${startByte}-${endByte} from ${url}`);
        } else {
            console.error(`HTTP error ${response.status} for ${url}: ${response.statusText}`);
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Range request failed for ${url}:`, error);
        throw error;
    }
}

function getTypeSize(type: string): number {
    switch (type) {
        case 'c':   // char
        case 'b':   // signed char
        case 'B':   // unsigned char
        case '?':   // _Bool
            return 1;
        case 'h':   // short
        case 'H':   // unsigned short
        case 'e':   // IEEE 754 binary16 "half precision"
            return 2;
        case 'i':   // int
        case "I":   // unsigned int
        case "l":   // long
        case "L":   // unsigned long
        case "f":   // float
            return 4;
        case "q":   // long long
        case "Q":   // unsigned long long
        case "d":   // double
            return 8;
        default:
            return 0;
    }
}

async function downloadTChunk(x: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    return dataSource === 'nc' ? downloadTChunkNC(x, varName, portion, timesJs) : downloadTChunkZarr(x, varName, portion, timesJs);
}

export async function downloadXYChunk(x: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    return dataSource === 'nc' ? downloadXYChunkNC(x, varName, portion, timesJs) : downloadXYChunkZarr(x, varName, portion, timesJs);
}

export function downloadTCSVChunked(x: number, varName: string, portion: string, doneCb: CsvDownloadDone, graph: boolean = false): void {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();

    downloadTChunk(x, varName, portion, timesJs)
        .then((floatArray: number[]) => {
            let asciiResult = "date;" + varName + "\n";

            let timesArray = timesJs.times[varName];
            if (typeof timesArray === 'string') {
                // Si es un string, convertirlo a array de un elemento
                timesArray = [timesArray];
            } else if (!Array.isArray(timesArray)) {
                console.error('Times data is not an array or string for', varName);
                return;
            }

            let baseData = zip(timesArray, floatArray);

            let download = false;
            baseData.forEach((value, index, array) => {
                if (!isNaN(value[1])) download = true;
                asciiResult += value[0];
                asciiResult += ';';
                if (['e', 'f', 'd'].includes(timesJs.varType))
                    asciiResult += parseFloat(value[1].toPrecision(ncSignif)) + "\n";
                else
                    asciiResult += value[1] + "\n";
            });

            if (download) {
                let xIndex: number = (x - 1) % timesJs.lonNum[varName + portion];
                let yIndex: number = Math.floor((x - 1) / timesJs.lonNum[varName + portion]);
                let xNC: number = timesJs.lonMin[varName + portion] + xIndex * (timesJs.lonMax[varName + portion] - timesJs.lonMin[varName + portion]) / (timesJs.lonNum[varName + portion] - 1);
                let yNC: number = timesJs.latMin[varName + portion] + yIndex * (timesJs.latMax[varName + portion] - timesJs.latMin[varName + portion]) / (timesJs.latNum[varName + portion] - 1);
                let mapCoordsCenter: number[] = proj4(timesJs.projection, 'EPSG:4326', [xNC, yNC]);
                let filename = mapCoordsCenter[0].toFixed(6) + '_' + mapCoordsCenter[1].toFixed(6) + '.csv';
                doneCb(asciiResult, filename, 'text/plain');
            }
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
}

export function downloadTArrayChunked(x: number, varName: string, portion: string, doneCb: ArrayDownloadDone): void {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();

    downloadTChunk(x, varName, portion, timesJs)
        .then((floatArray: number[]) => {
            doneCb(floatArray);
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
}

async function downloadTChunkNC(x: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    let app = window.CsViewerApp;
    let promise: Promise<number[]> = new Promise((resolve, reject) => {
        let chunkDataStruct = struct('<' + timesJs.offsetType + timesJs.sizeType);
        let chunkStruct = struct('<' + timesJs.varType);

        const chunkDataSize: number = getTypeSize(timesJs.offsetType) + getTypeSize(timesJs.sizeType);
        let chunkDataDir: bigint = BigInt((x - 1) * chunkDataSize);

        rangeRequest('./nc/' + varName + portion + '-t.bin', chunkDataDir, chunkDataDir + BigInt(chunkDataSize - 1))
            .then(chunkData => {
                let chunkOffset: number, chunkSize: number;
                [chunkOffset, chunkSize] = chunkDataStruct.unpack(chunkData.buffer);

                rangeRequest('./nc/' + varName + portion + '-t.nc', BigInt(chunkOffset), BigInt(chunkOffset) + BigInt(chunkSize) - BigInt(1))
                    .then(chunk => {
                        const uncompressedArray = inflate(chunk);
                        const floatArray = Array.from(chunkStruct.iter_unpack(uncompressedArray.buffer), x => x[0]);
                        app.transformDataT(floatArray, x, varName, portion);
                        resolve(floatArray);
                    })
                    .catch(error => {
                        console.error('Error downloading T chunk data: ', error);
                        reject(error);
                    });
            })
            .catch(error => {
                console.error('Error downloading T chunk metadata: ', error);
                reject(error);
            });
    });

    return promise;
}

async function downloadTChunkZarr(x: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    const zarrBasePath = window.location.origin + '/zarr';
    let app = window.CsViewerApp;
    let promise: Promise<number[]> = new Promise((resolve, reject) => {
        const xIndex = (x - 1) % timesJs.lonNum[varName + portion];
        const yIndex = Math.floor((x - 1) / timesJs.lonNum[varName + portion]);

        openArray({ store: zarrBasePath, path: varName + '/' + varName, mode: "r" })
            .then(varArray => {
                varArray.get([null, yIndex, xIndex])
                    .then(data => {
                        let floatArray: number[];
                        if (isNestedArray(data)) {
                            floatArray = Array.from(data.flatten(), value => Number(value));
                        } else {
                            floatArray = [Number(data)];
                        }

                        app.transformDataT(floatArray, x, varName, portion);
                        resolve(floatArray);
                    })
                    .catch(error => {
                        console.error('Error getting zarr time series data:', error);
                        reject(error);
                    });
            })
            .catch(error => {
                console.error('Error opening zarr array for time series:', error);
                reject(error);
            });
    });

    return promise;
}

export async function buildImages(promises: Promise<number[]>[], dataTilesLayer: any, status: CsViewerData, timesJs: CsTimesJsData, app: BaseApp, ncExtents: Array4Portion, uncertaintyLayer: boolean) {
    try {
        const floatArrays = await Promise.all(promises);

        const validFloatArrays = floatArrays.filter(arr => arr !== undefined && arr !== null);
        
        if (validFloatArrays.length === 0) {
            return;
        }

        const actualTimeIndex = getActualTimeIndex(status.selectedTimeIndex, status.varId, timesJs);

       
        if (!Array.isArray(timesJs.varMin[status.varId])) {
            timesJs.varMin[status.varId] = [];
        }
        if (!Array.isArray(timesJs.varMax[status.varId])) {
            timesJs.varMax[status.varId] = [];
        }
   
        const filteredArrays: number[][] = [];
        
        for (let i = 0; i < validFloatArrays.length; i++) {
            const filteredArray = await app.filterValues(validFloatArrays[i], actualTimeIndex, status.varId, timesJs.portions[status.varId][i]);
            filteredArrays.push(filteredArray);
        }

        let minArray: number = Number.MAX_VALUE;
        let maxArray: number = Number.MIN_VALUE;

        filteredArrays.forEach((filteredArray) => {
            filteredArray.forEach((value) => {
                if (!isNaN(value) && isFinite(value)) {
                    minArray = Math.min(minArray, value);
                    maxArray = Math.max(maxArray, value);
                }
            });
        });

        if (minArray === Number.MAX_VALUE || maxArray === Number.MIN_VALUE) {
            console.warn('No valid data found, using default ranges');
            minArray = 0;
            maxArray = 100;
        }

        try {
            (timesJs.varMin[status.varId] as number[])[actualTimeIndex] = minArray;
            (timesJs.varMax[status.varId] as number[])[actualTimeIndex] = maxArray;
        } catch (assignError) {
            console.error('Error assigning min/max values:', assignError);
            timesJs.varMin[status.varId] = [];
            timesJs.varMax[status.varId] = [];
            (timesJs.varMin[status.varId] as number[])[actualTimeIndex] = minArray;
            (timesJs.varMax[status.varId] as number[])[actualTimeIndex] = maxArray;
        }

        app.notifyMaxMinChanged();

        let painterInstance = PaletteManager.getInstance().getPainter();


        for (let i = 0; i < filteredArrays.length; i++) {
            const filteredArray = filteredArrays[i];

            const width = timesJs.lonNum[status.varId + timesJs.portions[status.varId][i]];
            const height = timesJs.latNum[status.varId + timesJs.portions[status.varId][i]];

            let canvas: HTMLCanvasElement | null = null;
            try {
                canvas = await painterInstance.paintValues(filteredArray, width, height, minArray, maxArray, pxTransparent, uncertaintyLayer);

                if (canvas) {
                    const extent = ncExtents[timesJs.portions[status.varId][i]];

                    const imageSource = new Static({
                        url: canvas.toDataURL('image/png'),
                        crossOrigin: '',
                        projection: olProjection,
                        imageExtent: extent,
                        interpolate: false
                    });

                    dataTilesLayer[i].setSource(imageSource);

                    dataTilesLayer[i].setZIndex(5000 + i);
                    dataTilesLayer[i].setVisible(true);
                    dataTilesLayer[i].setOpacity(1.0);

                    dataTilesLayer[i].changed();

                    await new Promise(resolve => setTimeout(resolve, 50));

                    if (window.CsViewerApp && (window.CsViewerApp as any).csMap) {
                        const map = (window.CsViewerApp as any).csMap.map;
                        if (map) {
                            const layers = map.getLayers();
                            const layerInMap = layers.getArray().includes(dataTilesLayer[i]);

                            if (!layerInMap) {
                                layers.push(dataTilesLayer[i]);
                            }
                        }
                    }
                                    
                }
                
            } catch (error) {
                console.error('paintValues failed:', error);
                continue;
            }
        }

        try {
            if (window.CsViewerApp && (window.CsViewerApp as any).csMap) {
                const map = (window.CsViewerApp as any).csMap.map;
                if (map) {
        
                    map.render();
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (map.renderSync) {
                        map.renderSync();
                    }
                                    } else {
                    console.warn('Map not available');
                }
            }
        } catch (renderError) {
            console.error('Error forcing map render:', renderError);
        }

    } catch (error) {
        console.error('Error in buildImages:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

export function downloadXYArrayChunked(requestedTimeIndex: number, varName: string, portion: string, doneCb: ArrayDownloadDone): void {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();

    const actualTimeIndex = getActualTimeIndex(requestedTimeIndex, varName, timesJs);

    downloadXYChunk(actualTimeIndex, varName, portion, timesJs)
        .then((floatArray: number[]) => {
            doneCb(floatArray);
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
}

let xyCache: {
    t: number,
    varName: string,
    portion: string,
    data: number[]
} = undefined

async function downloadXYChunkNC(t: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {

    let app = window.CsViewerApp;
    const actualTimeIndex = getActualTimeIndex(t, varName, timesJs);

    if (xyCache && xyCache.varName == varName && xyCache.portion == portion && xyCache.t == actualTimeIndex) {
        let ret = [...xyCache.data];
        app.transformDataXY(ret, actualTimeIndex, varName, portion);
        return ret;
    }

    try {
        if (!timesJs.offsetType || !timesJs.sizeType || !timesJs.varType) {
            const error = `Missing required types: offset=${timesJs.offsetType}, size=${timesJs.sizeType}, var=${timesJs.varType}`;
            console.error(error);
            throw new Error(error);
        }

        let chunkDataStruct = struct('<' + timesJs.offsetType + timesJs.sizeType);
        let chunkStruct = struct('<' + timesJs.varType);

        const chunkDataSize = getTypeSize(timesJs.offsetType) + getTypeSize(timesJs.sizeType);
        let chunkDataDir = BigInt(actualTimeIndex * chunkDataSize);

        const binUrl = `./nc/${varName}${portion}-xy.bin`;
        const ncUrl = `./nc/${varName}${portion}-xy.nc`;

        const chunkData = await rangeRequest(binUrl, chunkDataDir, chunkDataDir + BigInt(chunkDataSize - 1));

        let [chunkOffset, chunkSize] = chunkDataStruct.unpack(chunkData.buffer);

        if (chunkSize <= 0 || chunkOffset < 0) {
            throw new Error(`Invalid chunk metadata: offset=${chunkOffset}, size=${chunkSize}`);
        }

        const chunk = await rangeRequest(ncUrl, BigInt(chunkOffset), BigInt(chunkOffset) + BigInt(chunkSize) - BigInt(1));
        const uncompressedArray = inflate(chunk);
   
      
        const floatArray = Array.from(chunkStruct.iter_unpack(uncompressedArray.buffer), x => x[0]);

        if (!Array.isArray(floatArray) || floatArray.length === 0) {
            throw new Error(`Invalid float array: length=${floatArray.length}, isArray=${Array.isArray(floatArray)}`);
        }

        xyCache = { t: actualTimeIndex, varName, portion, data: [...floatArray] };

        let ret = [...floatArray];
        app.transformDataXY(ret, actualTimeIndex, varName, portion);


        return ret;

    } catch (error) {
        console.error('Context:', { varName, portion, actualTimeIndex });
        throw error;
    }
}

async function downloadXYChunkZarr(t: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    const zarrBasePath = window.location.origin + '/zarr';
    let app = window.CsViewerApp;

    // Get the actual time index to use for this variable
    const actualTimeIndex = getActualTimeIndex(t, varName, timesJs);

    // Check cache
    if (xyCache != undefined && xyCache.varName == varName && xyCache.portion == portion && xyCache.t == actualTimeIndex) {
        let ret = [...xyCache.data];
        app.transformDataXY(ret, actualTimeIndex, varName, portion);
        return ret;
    }

    try {
        const varArray = await openArray({ store: zarrBasePath, path: varName + '/' + varName, mode: "r" });

        const data = await varArray.get([actualTimeIndex]);

        let floatArray: number[];
        if (isNestedArray(data)) {
            floatArray = Array.from(data.flatten(), value => Number(value));
        } else {
            floatArray = [Number(data)];
        }

        if (xyCache == undefined) {
            xyCache = { t: actualTimeIndex, varName, portion, data: floatArray };
        } else {
            xyCache.t = actualTimeIndex;
            xyCache.varName = varName;
            xyCache.portion = portion;
            xyCache.data = floatArray;
        }

        let ret = [...floatArray];
        app.transformDataXY(ret, actualTimeIndex, varName, portion);
        return ret;
    } catch (error) {
        console.error('Error en downloadXYChunkZarr:', error);
        throw error;
    }
}

export function calcPixelIndex(ncCoords: number[], portion: string): number {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();
    let state: CsViewerData = window.CsViewerApp.getState();
    let xIndex: number = Math.round((ncCoords[0] - timesJs.lonMin[state.varId + portion]) / (timesJs.lonMax[state.varId + portion] - timesJs.lonMin[state.varId + portion]) * (timesJs.lonNum[state.varId + portion] - 1));
    let yIndex: number = Math.round((ncCoords[1] - timesJs.latMin[state.varId + portion]) / (timesJs.latMax[state.varId + portion] - timesJs.latMin[state.varId + portion]) * (timesJs.latNum[state.varId + portion] - 1));
    return xIndex + yIndex * timesJs.lonNum[state.varId + portion] + 1;
}

export function extractDataChunkedFromT(latlng: CsLatLong, functionValue: TileArrayCB, errorCb: DownloadErrorCB, status: CsViewerData, times: CsTimesJsData, int: boolean = false): void {
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        const chunkIndex: number = calcPixelIndex(ncCoords, portion);
        let cb: ArrayDownloadDone = (data: number[]) => {
            let download = false;
            data.forEach((value, index, array) => {
                if (!isNaN(value)) download = true;
            });
            if (download) {
                return functionValue(chunkIndex, data);
            } else {
                return functionValue(0, []);
            }
        }
        downloadTArrayChunked(chunkIndex, status.varId, portion, cb);
    } else {
        functionValue(0, []);
    }
}

export function extractValueChunkedFromT(latlng: CsLatLong, functionValue: TileArrayCB, errorCb: DownloadErrorCB, status: CsViewerData, times: CsTimesJsData, int: boolean = false): void {
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        const chunkIndex: number = calcPixelIndex(ncCoords, portion);
        let cb: ArrayDownloadDone = (data: number[]) => {
            let download = false;
            data.forEach((value, index, array) => {
                if (!isNaN(value)) download = true;
            });
            if (download) {
                // Use actual time index for single time step data
                const actualTimeIndex = getActualTimeIndex(status.selectedTimeIndex, status.varId, times);
                let value = Math.round(data[actualTimeIndex] * 10) / 10;
                return functionValue(value, data);
            } else {
                return functionValue(NaN, []);
            }
        }
        downloadTArrayChunked(chunkIndex, status.varId, portion, cb);
    } else {
        functionValue(NaN, []);
    }
}

export function extractValueChunkedFromXY(latlng: CsLatLong, functionValue: TileArrayCB, errorCb: DownloadErrorCB, status: CsViewerData, times: CsTimesJsData, int: boolean = false): void {
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        const chunkIndex: number = calcPixelIndex(ncCoords, portion);

        if (status.computedLayer) {
            let value = parseFloat(status.computedData[portion][chunkIndex - 1].toPrecision(ncSignif));
            return functionValue(value, [chunkIndex - 1, portion == '_can'? 0:1]);
        } else {
            let cb: ArrayDownloadDone = (data: number[]) => {
                let value = parseFloat(data[chunkIndex - 1].toPrecision(ncSignif));
                return functionValue(value, [chunkIndex - 1, portion == '_can'? 0:1]);
            }
            // Use the original requested time index, downloadXYArrayChunked will handle the conversion
            downloadXYArrayChunked(status.selectedTimeIndex, status.varId, portion, cb);
        }
    } else {
        functionValue(NaN, []);
    }
}

export function getPortionForPoint(ncCoords: number[], timesJs: CsTimesJsData, varId: string): string {
    let result: string = '';

    timesJs.portions[varId].some((portion: string, index, array) => {
        if (ncCoords[0] >= timesJs.lonMin[varId + portion] && ncCoords[0] <= timesJs.lonMax[varId + portion] &&
            ncCoords[1] >= timesJs.latMin[varId + portion] && ncCoords[1] <= timesJs.latMax[varId + portion]) {
            result = portion;
            return true;
        } else {
            return false;
        }
    });
    return result;
}

export function downloadCSVbySt(station: string, varName: string, doneCb: CsvDownloadDone): void {
    let csvData = '';
    downloadUrl("./stations/" + station + ".csv", (status: number, response) => {
        if (status == 200) {
            let rgResult;
            try {
                rgResult = response as Text;
            } catch (e) {
                rgResult = '';
            }
            doneCb(rgResult, 'data', 'text/plain');
        }
    }, undefined, 'text');
}

export function downloadCSVbyRegion(folder: string, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./regData/" + folder + "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let result: string
            try {
                result = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
            } catch (e) {
                result = '';
            }
            doneCb(result, 'data', 'text/plain');
        }
    }, undefined, 'text');
}

export function downloadTimebyRegion(folder: string, id: string, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./regData/" + folder + "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let rgResult: string[] = []
            let rgCSV = 'date;' + varName + '\r\n';
            try {
                let result = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                result.forEach((dataRow: any) => {
                    rgResult[dataRow['times_mean']] = dataRow[id]
                    rgCSV += dataRow['times_mean'] + ';' + dataRow[id] + '\r\n';
                })
            } catch (e) {
                rgCSV = '';
            }
            doneCb(rgCSV, 'data', 'text/plain');
        }
    }, undefined, 'text');
}

export function downloadXYbyRegion(time: string, timeIndex: number, folder: string, varName: string, doneCb: CsvDownloadDone) {
    downloadUrl("./regData/" + folder + "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let stResultTmInx: [] = [];
            let stResult: [] = [];
            try {
                const records = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                console.log(`[downloadXYbyRegion] varName="${varName}", timeIndex=${timeIndex}, records.length=${records.length}`);
                console.log(`[downloadXYbyRegion] records[${timeIndex}]['times_mean'] =`, records[timeIndex] ? records[timeIndex]['times_mean'] : 'undefined');
                if (varName.includes('beta_b0') && records[timeIndex]) {
                    console.log(`[downloadXYbyRegion] beta_b0 for province '1' (Araba):`, records[timeIndex]['1']);
                }
                stResult = records[timeIndex]
                // if (records.length == 1) stResult = records[0];
                // else {
                //     records.forEach((record: any) => {
                //         if (record['times_mean'] == time)
                //             stResult = record;
                //     });
                // }
            } catch (e) {
                console.error("Error parsing CSV:", e);
                stResult = [];
            }
            doneCb(stResult, varName, 'text/plain');
        } else {
            console.error("Error downloading CSV. Status:", status);
            doneCb([], varName, 'text/plain');
        }
    }, undefined, 'text');
}

export function downloadHistoricalDataForPercentile(
    latlng: CsLatLong, 
    varId: string,
    portion: string,
    timesJs: CsTimesJsData,
    callback: (historicalData: number[]) => void
): void {
    const ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], timesJs.projection);
    const chunkIndex: number = calcPixelIndex(ncCoords, portion);
    
    let cb: ArrayDownloadDone = (data: number[]) => {
        // Filtrar valores válidos
        const validData = data.filter(v => !isNaN(v) && isFinite(v));
        callback(validData);
    };
    
    downloadTArrayChunked(chunkIndex, varId, portion, cb);
}

