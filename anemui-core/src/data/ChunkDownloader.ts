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
import { ncSignif, hasInf, maxWhenInf, minWhenInf} from "../Env";
import * as fs from 'fs';
import * as path from 'path';

export type ArrayDownloadDone = (data: number[]) => void;
export type DateDownloadDone = (dataUrl: string) => void;
export type CsvDownloadDone = (data: any, filename: string, type: string) => void;
export type TileArrayCB = (value: number, values: number[]) => void;

/*
var palrgb = ["#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026"];
// color gradient
const gradient = new Uint32Array(256); // RGBA values
const rgba = new Uint8Array(gradient.buffer);
for (var i = 0; i < 256; i++) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(palrgb[i] + "bb");
    rgba[i * 4 + 0] = parseInt(result[1], 16);
    rgba[i * 4 + 1] = parseInt(result[2], 16);
    rgba[i * 4 + 2] = parseInt(result[3], 16);
    rgba[i * 4 + 3] = parseInt(result[4], 16);
}*/

export const pxTransparent: number = 0x00FFFFFF;
// Función TypeScript para combinar dos arrays en un array de arrays
// de manera similar a la función zip de Python
//
// Ejemplo:
// zip([1, 2, 3], [4, 5, 6]) -> [[1, 4], [2, 5], [3, 6]]
function zip<T, U>(a: T[], b: U[]): [T, U][] {
    return a.map((k, i) => [k, b[i]]);
}


export function browserDownloadFile(data: any, filename: string, type: string) {
    // Function to download data to a file
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


// Hace una petición HTTP con la cabecera Range
async function rangeRequest(url: string, startByte: bigint, endByte: bigint): Promise<Uint8Array> {
    const headers = new Headers();
    headers.append('Range', 'bytes=' + startByte + '-' + endByte);
    const response = await fetch(url, { headers: headers });
    if (response.status === 206) {
        return new Uint8Array(await response.arrayBuffer());
    } else {
        const spinner = document.querySelector<HTMLDivElement>('.spinner-grow');
        const loadingText = document.querySelector<HTMLSpanElement>('.blinking-text');
        const noData = document.querySelector<HTMLSpanElement>('.data-error-text');
        if (spinner) {
            spinner.hidden = true; 
            loadingText.hidden = true;
        }
        noData.hidden = false;
        throw new Error('HTTP Range error');
    }
}


// Obtiene el tamaño en bytes de los tipos de datos utilizados en el binario
// que contiene la información para localizar los chunks y el tipo de la variable
// principal que viaja en el propio chunk
// https://github.com/lyngklip/structjs
function getTypeSize(type: string): number {
    switch (type) { // Se indica C type en comentarios
        case 'c':   // char
        case 'b':   // signed char
        case 'B':   // unsigned char
        case '?':   // _Bool
            return 1;
            break;
        case 'h':   // short
        case 'H':   // unsigned short
        case 'e':   // IEEE 754 binary16 "half precision"
            return 2;
            break;
        case 'i':   // int
        case "I":   // unsigned int
        case "l":   // long
        case "L":   // unsigned long
        case "f":   // float
            return 4;
            break;
        case "q":   // long long
        case "Q":   // unsigned long long
        case "d":   // double
            return 8;
            break;
        default:
            return 0;
    }
}


// Obtener mínimo y máximo de un array de números
function getMinMax(arr: number[]): [number, number] {
    let len: number = arr.length;
    let min: number = Infinity;
    let max: number = -Infinity;

    while (len--) {
        if (!isNaN(arr[len])) {
            min = arr[len] < min ? arr[len] : min;
            max = arr[len] > max ? arr[len] : max;
        }
    }
    return [min, max];
}


// Obtener el chunk correspondiente y terminar llamando doneCb(data, filename, 'text/plain')
// x    Índice CSV contando desde 1
export function downloadTCSVChunked(x: number, varName: string, portion: string, doneCb: CsvDownloadDone, graph: boolean = false): void {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();

    downloadTChunk(x, varName, portion, timesJs)
        .then((floatArray: number[]) => {
            // formato ASCII
            let asciiResult = "date;" + varName + "\n";    // Cabecera CSV
            let baseData = zip(timesJs.times[varName], floatArray);
            // Flag de control de pixel vacío (todas las fechas NaN, normalmente por caer en mar)
            let download = false;
            baseData.forEach((value, index, array) => {
                if (!isNaN(value[1])) download = true;
                asciiResult += value[0];
                asciiResult += ';';
                if (graph && hasInf) {
                    if (value[1] == Infinity || value[1] > maxWhenInf) value[1] = maxWhenInf
                    if (value[1] == -Infinity || value[1] < minWhenInf) value[1] = minWhenInf
                }
                if (['e', 'f', 'd'].includes(timesJs.varType))
                    asciiResult += parseFloat(value[1].toPrecision(ncSignif)) + "\n";
                else
                    asciiResult += value[1] + "\n";
            });

            // Dibujado de pixel y descarga de CSV
            if (download) {
                // Cálculo de coordenadas del centro del pixel
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

// Obtener el chunk correspondiente y terminar llamando doneCb(data, filename, 'text/plain')
// x    Índice CSV contando desde 1
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

async function downloadTChunk(x: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    let app = window.CsViewerApp;
    let promise: Promise<number[]> = new Promise((resolve, reject) => {
        let chunkDataStruct = struct('<' + timesJs.offsetType + timesJs.sizeType);
        let chunkStruct = struct('<' + timesJs.varType);

        // Cálculo de la dirección de la información del chunk dentro del fichero binario
        // que contiene el directorio de chunks
        const chunkDataSize: number = getTypeSize(timesJs.offsetType) + getTypeSize(timesJs.sizeType);
        let chunkDataDir: bigint = BigInt((x - 1) * chunkDataSize);

        // Petición range request de la información del chunk (offset y size)
        rangeRequest('./nc/' + varName + portion + '-t.bin', chunkDataDir, chunkDataDir + BigInt(chunkDataSize - 1))
            .then(chunkData => {
                let chunkOffset: number, chunkSize: number;
                [chunkOffset, chunkSize] = chunkDataStruct.unpack(chunkData.buffer);
                // Petición range request del chunk
                rangeRequest('./nc/' + varName + portion + '-t.nc', BigInt(chunkOffset), BigInt(chunkOffset) + BigInt(chunkSize) - BigInt(1))
                    .then(chunk => {
                        // Descomprir los datos recibidos
                        const uncompressedArray = inflate(chunk);
                        // Crear un array de valores a partir de los bytes
                        const floatArray = Array.from(chunkStruct.iter_unpack(uncompressedArray.buffer), x => x[0]);
                        app.transformDataT(floatArray, x, varName, portion);
                        resolve(floatArray);
                    })
                    .catch(error => {
                        console.error('Error: ', error);
                    });
            })
            .catch(error => {
                console.error('Error: ', error);
            });
    });

    return promise;
}


export function buildImages(promises: Promise<number[]>[], dataTilesLayer: any, status: CsViewerData, timesJs: CsTimesJsData, app: BaseApp, ncExtents: Array4Portion, uncertaintyLayer: boolean) {
    // We can only determine the maximums and minimums and draw the data layers when all the promises are resolved.
    Promise.all(promises).then((floatArrays) => {
        // We determine the minimum and maximum of the data layer values excluding the NaNs
        let minArray: number = Number.MAX_VALUE;
        let maxArray: number = Number.MIN_VALUE;
        let painter = PaletteManager.getInstance().getPainter();
        floatArrays.forEach((floatArray, index) => {
            floatArray.forEach((value) => {
                if (!isNaN(value)) {
                    minArray = Math.min(minArray, value);
                    maxArray = Math.max(maxArray, value);
                }
            });
        });
        timesJs.varMin[status.varId][status.selectedTimeIndex] = minArray;
        timesJs.varMax[status.varId][status.selectedTimeIndex] = maxArray;
        app.notifyMaxMinChanged();
        minArray = timesJs.varMin[status.varId][status.selectedTimeIndex];
        maxArray = timesJs.varMax[status.varId][status.selectedTimeIndex];

        // Now that we have the absolute maximums and minimums, we paint the data layers.
        floatArrays.forEach((floatArray, index) => {
            const width: number = timesJs.lonNum[status.varId + timesJs.portions[status.varId][index]];
            const height: number = timesJs.latNum[status.varId + timesJs.portions[status.varId][index]];
            // We call filterValues to apply the selection filter and the comparison filter if necessary and when it is resolved we paint the data layer.
            app.filterValues(floatArray, status.selectedTimeIndex, status.varId, timesJs.portions[status.varId][index])
                .then((floatArray) => {
                    painter.paintValues(floatArray, width, height, minArray, maxArray, pxTransparent, uncertaintyLayer)
                        .then((canvas) => {
                            dataTilesLayer[index].setSource(new Static({
                                url: canvas.toDataURL('image/png'),
                                crossOrigin: '',
                                projection: timesJs.projection,
                                imageExtent: ncExtents[timesJs.portions[status.varId][index]],
                                interpolate: false
                            }));
                        });
                });
        });
    });
}

export function downloadXYArrayChunked(x: number, varName: string, portion: string, doneCb: ArrayDownloadDone): void {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();

    downloadXYChunk(x, varName, portion, timesJs)
        .then((floatArray: number[]) => {

            doneCb(floatArray);
        })
        .catch((error) => {
            console.error('Error: ', error);
        });
}
/* Cacheamos las peticiones a downloadXY_Chunk, pero solo la ultima */
let xyCache: {
    t: number,
    varName: string,
    portion: string,
    data: number[]
} = undefined

export async function downloadXYChunk(t: number, varName: string, portion: string, timesJs: CsTimesJsData): Promise<number[]> {
    let app = window.CsViewerApp
    //Como es Async podemos hacer un return del dato
    if (xyCache != undefined && xyCache.varName == varName && xyCache.portion == portion && xyCache.t == t) {
        let ret = [...xyCache.data]; //Una copia sin referencia
        app.transformDataXY(ret, t, varName, portion);
        return ret
    }

    let promise: Promise<number[]> = new Promise((resolve, reject) => {
        let app = window.CsViewerApp;
        let timesJs: CsTimesJsData = app.getTimesJs();
        let chunkDataStruct = struct('<' + timesJs.offsetType + timesJs.sizeType);
        let chunkStruct = struct('<' + timesJs.varType);

        // Cálculo de la dirección de la información del chunk dentro del fichero binario
        // que contiene el directorio de chunks
        const chunkDataSize: number = getTypeSize(timesJs.offsetType) + getTypeSize(timesJs.sizeType);
        let chunkDataDir: bigint = BigInt(t * chunkDataSize);

        // Petición range request de la información del chunk (offset y size)
        rangeRequest('./nc/' + varName + portion + '-xy.bin', chunkDataDir, chunkDataDir + BigInt(chunkDataSize - 1))
            .then((chunkData: Uint8Array) => {
                let [chunkOffset, chunkSize] = chunkDataStruct.unpack(chunkData.buffer);
                // Petición range request del chunk
                rangeRequest('./nc/' + varName + portion + '-xy.nc', BigInt(chunkOffset), BigInt(chunkOffset) + BigInt(chunkSize) - BigInt(1))
                    .then((chunk: Uint8Array) => {
                        // Decompress the received data
                        const uncompressedArray = inflate(chunk);
                        // Create an array of values from the bytes
                        const floatArray = Array.from(chunkStruct.iter_unpack(uncompressedArray.buffer), x => x[0]);
                        /* Gestion de Cache */
                        if (xyCache == undefined) {
                            xyCache = { t: t, varName, portion, data: floatArray }
                        } else {
                            xyCache.t = t;
                            xyCache.varName = varName;
                            xyCache.portion = portion;
                            xyCache.data = floatArray;
                        }
                        let ret = [...floatArray];
                        app.transformDataXY(ret, t, varName, portion);
                        resolve(ret);
                    })
                    .catch(error => {
                        console.error('Error: ', error);
                    });
            })
            .catch(error => {
                console.error('Error: ', error);
            });
    });

    return promise;
}


// Calcula el índice correlativo del pixel dentro del nc chunkeado para descargar las series temporales de cada pixel.
// El índice empieza a contar en 1 siendo éste el pixel superior izquierdo y termina en lonNum*latNum siendo éste el pixel inferior derecho.
// El argumento ncCoords es un array de dos elementos con las coordenadas del pixel en el sistema de referencia del nc.
export function calcPixelIndex(ncCoords: number[], portion: string): number {
    let timesJs: CsTimesJsData = window.CsViewerApp.getTimesJs();
    let state: CsViewerData = window.CsViewerApp.getState();
    // Cálculo del índice del pixel (xIndex: [0 - lonNum], yIndex: [0 - latNum])
    let xIndex: number = Math.round((ncCoords[0] - timesJs.lonMin[state.varId + portion]) / (timesJs.lonMax[state.varId + portion] - timesJs.lonMin[state.varId + portion]) * (timesJs.lonNum[state.varId + portion] - 1));
    let yIndex: number = Math.round((ncCoords[1] - timesJs.latMin[state.varId + portion]) / (timesJs.latMax[state.varId + portion] - timesJs.latMin[state.varId + portion]) * (timesJs.latNum[state.varId + portion] - 1));
    // Índice correlativo del pixel (empieza a contar en 1)
    return xIndex + yIndex * timesJs.lonNum[state.varId + portion] + 1;
}


export function extractDataChunkedFromT(latlng: CsLatLong, functionValue: TileArrayCB, errorCb: DownloadErrorCB, status: CsViewerData, times: CsTimesJsData, int: boolean = false): void {
    // Calculamos coordenadas del punto en el sistema de proyección del fichero netCDF
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        // Índice correlativo del pixel (empieza a contar en 1)
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
    // Calculamos coordenadas del punto en el sistema de proyección del fichero netCDF
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        // Índice correlativo del pixel (empieza a contar en 1)
        const chunkIndex: number = calcPixelIndex(ncCoords, portion);
        let cb: ArrayDownloadDone = (data: number[]) => {
            let download = false;
            data.forEach((value, index, array) => {
                if (!isNaN(value)) download = true;
            });
            if (download) {
                let value = Math.round(data[status.selectedTimeIndex] * 10) / 10;
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
    // We calculate the point's coordinates in the projection system of the netCDF file
    let ncCoords: number[] = fromLonLat([latlng.lng, latlng.lat], times.projection);
    let portion: string = getPortionForPoint(ncCoords, times, status.varId);
    if (portion != '') {
        // Correlative index of the pixel (starts counting at 1)
        const chunkIndex: number = calcPixelIndex(ncCoords, portion);
        let cb: ArrayDownloadDone = (data: number[]) => {
            let value = parseFloat(data[chunkIndex - 1].toPrecision(ncSignif));
            return functionValue(value, []);
        }
        downloadXYArrayChunked(status.selectedTimeIndex, status.varId, portion, cb);

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
    // downloadUrl("./stations/" + varName + "/" + station + ".csv", (status: number, response) => {
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

export function downloadCSVbyRegion(region: number, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./data/" + renderers.folder[region] + "/" + varName + ".csv", (status: number, response) => {
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

export function downloadTimebyRegion(region: number, id: string, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./data/" + renderers.folder[region] + "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let rgResult: string[] = []
            let rgCSV = 'date;' + varName +'\r\n';
            try {
                let result = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                result.forEach( (dataRow: any) => {
                    rgResult[dataRow['times_mean']] = dataRow['X'+id]
                    rgCSV += dataRow['times_mean'] + ';' + dataRow['X'+id] +'\r\n';
                })
            } catch (e) {
                rgCSV = '';
            }
            doneCb(rgCSV, 'data', 'text/plain') ;
        }
    },undefined,'text');
}

export function downloadXYbyRegion(time: string, region: number, varName: string, doneCb: CsvDownloadDone): void {
    downloadUrl("./data/" + renderers.folder[region] +  "/" + varName + ".csv", (status: number, response) => {
        if (status == 200) {
            let stResult: []
            try {
                const records = parse(response as Buffer, {
                    columns: true,
                    skip_empty_lines: true
                });
                if (records.length == 1) stResult = records[0]
                else  {
                    records.forEach((record:any) => {
                        if (record['times_mean'] == time)
                        stResult = record
                    })
                }
            } catch (e) {
                stResult = [];
            }
            doneCb(stResult, 'data', 'text/plain') ;
        }
    },undefined,'text');
}