import { CsLatLong } from "../CsMapTypes";
import { CsTimesJsData, CsViewerData, Array4Portion } from "./CsDataTypes";
import { DownloadDoneCB, DownloadErrorCB, downloadUrl } from "./UrlDownloader";
import { renderers } from "./../tiles/Support";
import struct from './struct.mjs';
import { inflate } from 'pako';
import { parse } from 'csv-parse/sync';
import proj4 from 'proj4';
import { fromLonLat } from "ol/proj";
import { PaletteManager } from "../PaletteManager";
import { BaseApp } from "../BaseApp";
import Static from "ol/source/ImageStatic";
import { ncSignif, dataSource, computedDataTilesLayer} from "../Env";
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
        
        // Para datos de un solo paso temporal
        if (availableTimes.length === 1) {
            return 0;
        }
        
        const isUncertaintyVar = varName.includes('_uncertainty');
        
        // Para ai_serie_anu (pero NO para su versión _uncertainty)
        if (varName === 'ai_serie_anu' && requestedTimeIndex >= availableTimes.length - 3) {
            console.warn(`Adjusting time index for ${varName}: requested=${requestedTimeIndex}, using=${availableTimes.length - 4}`);
            return Math.max(0, availableTimes.length - 4);
        }
        
        // Para variables de incertidumbre, validar que el índice esté dentro del rango
        if (isUncertaintyVar) {
            if (requestedTimeIndex >= availableTimes.length) {
                console.warn(`Uncertainty var ${varName}: Requested index ${requestedTimeIndex} exceeds available data (max: ${availableTimes.length - 1}). Using last available index.`);
                return availableTimes.length - 1;
            }
            
            return Math.max(0, requestedTimeIndex);
        }
        
        // Para el resto de variables
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
                timesArray = [timesArray];
            } else if (!Array.isArray(timesArray)) {
                console.error('Times data is not an array or string for', varName);
                return;
            }
            
            let baseData = zip(timesArray, floatArray);
            
            let download = false;
            
            if (varName === 'ai_serie_anu') {
                baseData.forEach((value, index, array) => {
                    const numValue = value[1];
                    const isValidNumber = numValue != null && !isNaN(numValue) && isFinite(numValue);
                    
                    if (isValidNumber) download = true;
                    
                    asciiResult += value[0];
                    asciiResult += ';';
                    
                    if (isValidNumber) {
                        if (['e', 'f', 'd'].includes(timesJs.varType))
                            asciiResult += parseFloat(numValue.toPrecision(ncSignif)) + "\n";
                        else
                            asciiResult += numValue + "\n";
                    } else {
                        asciiResult += "\n"; // Línea vacía para valores inválidos
                    }
                });
            } else {
                // Código original para otras variables
                baseData.forEach((value, index, array) => {
                    if (!isNaN(value[1])) download = true;
                    asciiResult += value[0];
                    asciiResult += ';';
                    if (['e', 'f', 'd'].includes(timesJs.varType))
                        asciiResult += parseFloat(value[1].toPrecision(ncSignif)) + "\n";
                    else
                        asciiResult += value[1] + "\n";
                });
            }

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
            console.error('No valid data arrays received in buildImages');
            return;
        }

        const varIdForData = uncertaintyLayer ? status.varId + '_uncertainty' : status.varId;
        const varIdForStructures = status.varId;
        
        const actualTimeIndex = getActualTimeIndex(status.selectedTimeIndex, varIdForData, timesJs);

        
        let minArray: number;
        let maxArray: number;
        
        if (uncertaintyLayer) {
            minArray = 0;
            maxArray = 1;
            
        } else {
            minArray = Number.MAX_VALUE;
            maxArray = Number.MIN_VALUE;
            
            validFloatArrays.forEach((floatArray, index) => {
                if (floatArray && Array.isArray(floatArray)) {
                    floatArray.forEach((value) => {
                        if (!isNaN(value) && isFinite(value)) {
                            minArray = Math.min(minArray, value);
                            maxArray = Math.max(maxArray, value);
                        }
                    });
                }
            });

            if (!Array.isArray(timesJs.varMin[status.varId])) {
                timesJs.varMin[status.varId] = [];
            }
            if (!Array.isArray(timesJs.varMax[status.varId])) {
                timesJs.varMax[status.varId] = [];
            }

            timesJs.varMin[status.varId][actualTimeIndex] = minArray;
            timesJs.varMax[status.varId][actualTimeIndex] = maxArray;
            
            app.notifyMaxMinChanged();
            
            minArray = timesJs.varMin[status.varId][actualTimeIndex];
            maxArray = timesJs.varMax[status.varId][actualTimeIndex];
        }

        let painter = PaletteManager.getInstance().getPainter();

        for (let i = 0; i < floatArrays.length; i++) {
            const floatArray = floatArrays[i];
            const portionKey = varIdForStructures + timesJs.portions[varIdForStructures][i];
            const width: number = timesJs.lonNum[portionKey];
            const height: number = timesJs.latNum[portionKey];

            const filteredArray = await app.filterValues(floatArray, actualTimeIndex, varIdForStructures, timesJs.portions[varIdForStructures][i]);
    
            if (uncertaintyLayer) {
             
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('2D context not available');

                    const imgData = ctx.createImageData(width, height);
                 
                    const totalPixels = width * height;
                    for (let p = 0; p < totalPixels; p++) {
                        const v = filteredArray && filteredArray[p] !== undefined ? filteredArray[p] : NaN;
                        
                        const x = p % width;
                        const y = Math.floor(p / width);
                        const flippedY = height - 1 - y;
                        const flippedIdx = (flippedY * width + x) * 4;
            
                        const isOne = (v === 1) || (typeof v === 'number' && Math.abs(v - 1) < 1e-9);
                        if (isOne) {
                            imgData.data[flippedIdx] = 128;     
                            imgData.data[flippedIdx + 1] = 128;
                            imgData.data[flippedIdx + 2] = 128; 
                            imgData.data[flippedIdx + 3] = 255; 
                        } else {
                            imgData.data[flippedIdx] = 0;
                            imgData.data[flippedIdx + 1] = 0;
                            imgData.data[flippedIdx + 2] = 0;
                            imgData.data[flippedIdx + 3] = 0; 
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                    
                    dataTilesLayer[i].setSource(new Static({
                        url: canvas.toDataURL('image/png'),
                        crossOrigin: '',
                        projection: timesJs.projection,
                        imageExtent: ncExtents[timesJs.portions[varIdForStructures][i]],
                        interpolate: false
                    }));

                } catch (err) {
                    console.error('Error painting uncertainty canvas:', err);
                    // Fallback to painter if something fails
                    const canvas = await painter.paintValues(filteredArray, width, height, minArray, maxArray, pxTransparent, true);
                    dataTilesLayer[i].setSource(new Static({
                        url: canvas.toDataURL('image/png'),
                        crossOrigin: '',
                        projection: timesJs.projection,
                        imageExtent: ncExtents[timesJs.portions[varIdForStructures][i]],
                        interpolate: false
                    }));
                }
            } else {
                const canvas = await painter.paintValues(filteredArray, width, height, minArray, maxArray, pxTransparent, uncertaintyLayer);

                dataTilesLayer[i].setSource(new Static({
                    url: canvas.toDataURL('image/png'),
                    crossOrigin: '',
                    projection: timesJs.projection,
                    imageExtent: ncExtents[timesJs.portions[varIdForStructures][i]],
                    interpolate: false
                }));
            }
        }
        
        
        
    } catch (error) {
        console.error('Error in buildImages:', error);
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

    // Get the actual time index to use for this variable
    const actualTimeIndex = getActualTimeIndex(t, varName, timesJs);
    
    const isUncertainty = varName.includes('_uncertainty');
    
    
    if (xyCache != undefined && xyCache.varName == varName && xyCache.portion == portion && xyCache.t == actualTimeIndex) {
        let ret = [...xyCache.data];
        app.transformDataXY(ret, actualTimeIndex, varName, portion);
        return ret;
    }

    try {
        let chunkDataStruct = struct('<' + timesJs.offsetType + timesJs.sizeType);
        let chunkStruct = struct('<' + timesJs.varType);

        const chunkDataSize: number = getTypeSize(timesJs.offsetType) + getTypeSize(timesJs.sizeType);
        let chunkDataDir: bigint = BigInt(actualTimeIndex * chunkDataSize);

        const binUrl = './nc/' + varName + portion + '-xy.bin';

        const chunkData = await rangeRequest(binUrl, chunkDataDir, chunkDataDir + BigInt(chunkDataSize - 1));

        let [chunkOffset, chunkSize] = chunkDataStruct.unpack(chunkData.buffer);

        const ncUrl = './nc/' + varName + portion + '-xy.nc';
        const chunk = await rangeRequest(ncUrl, BigInt(chunkOffset), BigInt(chunkOffset) + BigInt(chunkSize) - BigInt(1));


        const uncompressedArray = inflate(chunk);
        const floatArray = Array.from(chunkStruct.iter_unpack(uncompressedArray.buffer), x => x[0]);


        // Update cache with actual time index used
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
        console.error('Error in downloadXYChunkNC:', {
            varName,
            portion,
            error: error.message
        });
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

        // Update cache
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
            return functionValue(value, []);
        } else {
            let cb: ArrayDownloadDone = (data: number[]) => {
                let value = parseFloat(data[chunkIndex - 1].toPrecision(ncSignif));
                return functionValue(value, []);
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

// Regional data functions remain unchanged
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
            doneCb(rgResult, 'data', 'text/plain') ;
        }
    },undefined,'text');
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
            doneCb(result, 'data', 'text/plain') ;
        }
    },undefined,'text');
}

export function downloadTimebyRegion(folder: string, id: string, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./regData/" + folder + "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let rgResult: string[] = []
            let rgCSV = 'date;' + varName +'\r\n';
            try {
                let result = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                result.forEach( (dataRow: any) => {
                    rgResult[dataRow['times_mean']] = dataRow[id]
                    rgCSV += dataRow['times_mean'] + ';' + dataRow[id] +'\r\n';
                })
            } catch (e) {
                rgCSV = '';
            }
            doneCb(rgCSV, 'data', 'text/plain') ;
        }
    },undefined,'text');
}

export function downloadXYbyRegion(time: string, folder: string, varName: string, doneCb: CsvDownloadDone) {
    downloadUrl("./regData/" + folder +  "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let stResult: [];
            try {
                const records = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                if (records.length == 1) stResult = records[0];
                else {
                    records.forEach((record: any) => {
                        if (record['times_mean'] == time)
                            stResult = record;
                    });
                }
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