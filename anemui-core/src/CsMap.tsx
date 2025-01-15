import { createElement } from "tsx-create-element";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent, CsMapListener } from "./CsMapTypes";
import { CsViewerData } from "./data/CsDataTypes";
import { BaseApp } from "./BaseApp";
import { abstract } from "ol/util";

export abstract class CsGeoJsonLayer{
    protected data:GeoJSON.Feature[]
    public abstract show(type:number):void;
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

    public onMapClick(event: CsMapEvent): void {
        console.log("Evento recibido:", event);
    
        if (!event || !event.latLong) {
            console.error("El objeto event o latLong no están definidos:", event);
            return;
        }
    
        this.listener.onClick(event);

        setTimeout(() => {
            this.checkDataToShowGraph();
        }, 500);
    }

    private checkDataToShowGraph(){
        if (this.parent.getLastLlData() && this.parent.getLastLlData().latlng !== undefined) {
            console.log(this.parent.getLastLlData().latlng);
            this.parent.showGraph();
        } else {
            console.warn("lastLlData o latlng no están definidos:", this.parent.getLastLlData());
        }
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

