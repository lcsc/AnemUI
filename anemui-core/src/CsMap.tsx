import { createElement } from "tsx-create-element";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent, CsMapListener } from "./CsMapTypes";
import { CsViewerData, CsGeoJsonData } from "./data/CsDataTypes";
import { BaseApp } from "./BaseApp";
import { defaultRenderer } from "./tiles/Support"
import { abstract } from "ol/util";

export abstract class CsGeoJsonLayer{
    protected data: CsGeoJsonData
    public abstract show(type:number):void;
    public abstract hide():void;
    public abstract setPopupContent(popup:any,content:HTMLElement,event:any):void;
    
    public getFeature(id:string):GeoJSON.Feature{
        if(this.data==undefined) return undefined;
        for(let i =0; i< this.data.features.length;i++){
            // if(this.data[i].properties["id"]==id)return this.data[i];
            if(this.data.features[i].properties["id"]==id)return this.data.features[i];
        }
        return undefined
    }

    constructor(_data:CsGeoJsonData){    
        this.data=_data
    }

    public refresh():void{
        
    }
    public getData():CsGeoJsonData{
        return this.data;
    }
    public getFeatures():GeoJSON.Feature[]{
        return this.data.features;
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
        ret= (<div id="map" ><div id="popUp" className="ol-popup"></div></div>);
        
       return ret; 
    }

    public onDragStart(event:CsMapEvent):void{
        this.listener.onDragStart(event);
    }

    public onMapLoaded():void{
        this.listener.onMapLoaded();
    }

    public onMapClick(event: CsMapEvent): void {
        if (this.parent.getState().support!= defaultRenderer) return
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

    public showFeatureValue (data: any, pixel: any, pos: CsLatLong, target:any) {
        this.controller.showFeatureValue (data, pixel, pos, target) 
    };

    public updateRender(support: string) {
        this.controller.updateRender(support)
    }
}

