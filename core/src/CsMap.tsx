import { createElement } from "tsx-create-element";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent, CsMapListener } from "./CsMapTypes";
import { CsViewerData } from "./data/CsDataTypes";
import { BaseApp } from "./BaseApp";
import { abstract } from "ol/util";

export abstract class CsGeoJsonLayer{
    protected data:GeoJSON.Feature[]
    public abstract show():void;
    public abstract hide():void;
    public abstract setPopupContent(popup:any,content:HTMLElement,event:any):void;
    
    public getFeature(id:string):GeoJSON.Feature{
        if(this.data==undefined) return undefined;
        for(let i =0; i< this.data.length;i++){
            if(this.data[i].properties["id"]==id)return this.data[i];
        }

        return undefined
    }

    constructor(_data:GeoJSON.Feature[]){
        this.data=_data
    }

    public refresh():void{
        
    }
    public getData():GeoJSON.Feature[]{
        return this.data;
    }
}


export class CsMap{
    protected parent:BaseApp;
    protected controller:CsMapController;
    protected listener:CsMapListener;

    constructor(_parent:BaseApp,_controller:CsMapController, _listener:CsMapListener,){
        this.controller=_controller;
        this.listener=_listener;
        this.parent=_parent;
    }

    public init(){
        this.controller.init(this)
        this.listener.onMapInited();
    }

    render():JSX.Element{
        let ret:JSX.Element;
        ret= (<div id="map" ></div>);
        
       return ret; 
    }

    public onDragStart(event:CsMapEvent):void{
        this.listener.onDragStart(event);
    }

    public onMapLoaded():void{
        this.listener.onMapLoaded();
    }

    public onMapClick(event:CsMapEvent):void{
        //this.controller.putMarker(event.latLong);
        this.listener.onClick(event);
    }

    public onMouseMoveEnd(event:CsMapEvent):void{
        this.listener.onMouseMoveEnd(event)
    }

    public showMarker(latLong:CsLatLong){
        this.controller.putMarker(latLong);
    }

    public updateDate(selectedTimeIndex: number, state: CsViewerData) {
        this.controller.setDate(selectedTimeIndex,state);
    }

    public getParent():BaseApp{
        return this.parent;
    }
    public getZoom():number{
        return this.controller.getZoom();
    }

    public showValue(latLong:CsLatLong,value:number){
        this.controller.showValue(latLong,value)
    }

    public getGeoJsonLayer(data:GeoJSON.Feature[],onClick:CsGeoJsonClick):CsGeoJsonLayer{
       return this.controller.getGeoJsonLayer(data,onClick);
    }

    public updateRender(support: string) {
        this.controller.updateRender(support)
    }
}

