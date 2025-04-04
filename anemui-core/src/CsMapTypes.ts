import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsViewerData } from "./data/CsDataTypes";

export interface CsLatLong{
    lat:number
    lng:number
}
export interface CsPoint{
    x:number
    y:number
}

export class CsMapEvent{
    public original:any;
    public latLong:CsLatLong;
    public point:CsPoint
}

export interface CsMapController{
    updateRender(support: string): void;
    init(_parent:CsMap):void;
    putMarker(pos:CsLatLong):void;
    setDate(dateIndex:number, state:CsViewerData):void;
    getZoom():number;
}

export type CsGeoJsonClick=(feature:GeoJSON.Feature,event:any)=>void

export interface CsMapListener{
    onMapInited():void;
    onMapLoaded():void;
    onDragStart(event:CsMapEvent):void;
    onClick(event:CsMapEvent):void;
    // onMouseMoveEnd(event:CsMapEvent):void;
}

function isCsPoint(p:any):p is CsPoint{
    return 'x' in p && 'y' in p
}
export function toCsPoint(p:any):CsPoint{
    if(isCsPoint(p)){
        return p as CsPoint
    }
    return null;
}

function isCsLatLong(p:any):p is CsLatLong{
    return 'lat' in p && 'lng' in p
}
export function toCsLatLong(p:any):CsLatLong{
    if(isCsLatLong(p)){
        return p as CsLatLong
    }
    return null;
}