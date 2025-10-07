import { createElement } from "tsx-create-element";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent, CsMapListener } from "./CsMapTypes";
import { CsViewerData, CsGeoJsonData, CsTimesJsData } from "./data/CsDataTypes";
import { BaseApp } from "./BaseApp";
import { defaultRenderer } from "./tiles/Support"
import { abstract } from "ol/util";

export abstract class CsGeoJsonLayer{
    protected geoData: CsGeoJsonData
    public abstract show(type:number):void;
    public abstract hide():void;
    public abstract setPopupContent(popup:any,content:HTMLElement,event:any):void;
    
    public getFeature(id:string):GeoJSON.Feature{
        if(this.geoData==undefined) return undefined;
        for(let i =0; i< this.geoData.features.length;i++){
            // if(this.geoData[i].properties["id"]==id)return this.geoData[i];
            if(this.geoData.features[i].properties["id"]==id)return this.geoData.features[i];
        }
        return undefined
    }

    constructor(_geoData:CsGeoJsonData){    
        this.geoData=_geoData
    }

    public refresh():void{
        
    }
    public getData():CsGeoJsonData{
        return this.geoData;
    }
    public getFeatures():GeoJSON.Feature[]{
        return this.geoData.features;
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
            this.parent.showGraph({type: 'point'});
        } else {
            console.warn("lastLlData o latlng no están definidos:", this.parent.getLastLlData());
        }
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

    public updateRender(support: string) {
        this.controller.updateRender(support)
    }

    public refreshFeatureLayer() {
        this.controller.refreshFeatureLayer()
    }

}

