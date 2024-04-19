import { Feature, Map, MapBrowserEvent, MapEvent, Overlay, TileQueue, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent } from "./CsMapTypes";
import { CsTimesJsData, CsViewerData, Array4Portion } from "./data/CsDataTypes";
import { MapOptions } from "ol/Map";
import { TileWMS, XYZ, OSM, TileDebug, ImageStatic as Static } from "ol/source";
import { Image as ImageLayer, Layer, WebGLTile as TileLayer } from 'ol/layer';
import { Coordinate } from "ol/coordinate";
import { fromLonLat, toLonLat, transform } from "ol/proj";
import { PaletteManager } from "./PaletteManager";
import { isTileDebugEnabled, isWmsEnabled, mapboxAccessToken, mapboxMapID, olProjection, initialZoom } from "./Env";
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { buildImages, downloadXYChunk, pxTransparent } from "./data/ChunkDownloader";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
import { FeatureLike } from "ol/Feature";
import BaseLayer from "ol/layer/Base";
import ImageSource from "ol/source/Image";

// Define alternative projections
proj4.defs([
  ['EPSG:25830',
    '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs'],
  ['recorte_aemet',
    '+proj=lcc +lat_1=40 +lat_0=40 +lon_0=-5 +k_0=1 +x_0=1424212.62930891 +y_0=1064393.31507647 +R=6367470 +units=m +no_defs +type=crs']
]);
register(proj4);

const imgStation = new CircleStyle({
  radius: 8,
  fill: new Fill({color:'#00f855CC'}),
  stroke: new Stroke({color: '#FFFFFF', width: 1}),
});
export const DEF_STYLE_STATIONS=new Style({image:imgStation,})

//const SLD='<?xml version="1.0" encoding="ISO-8859-1"?>'+
const SLD_HEADER='<StyledLayerDescriptor version="1.0.0"'+
    ' xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"'+
    ' xmlns="http://www.opengis.net/sld"'+
    ' xmlns:ogc="http://www.opengis.net/ogc"'+
    ' xmlns:xlink="http://www.w3.org/1999/xlink"'+
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
  '<NamedLayer>'+
    '<Name>lcsc:value</Name>'+
    '<UserStyle>'+
      '<Title>NetCDF SPEI Custom</Title>'+
      '<FeatureTypeStyle>'+
        '<Rule>'+
          '<RasterSymbolizer>'+
            '<ColorMap>';
const SLD_END='</ColorMap>'+
            '</RasterSymbolizer>'+
          '</Rule>'+
        '</FeatureTypeStyle>'+
      '</UserStyle>'+
'  </NamedLayer>'+
'</StyledLayerDescriptor>'


export class OpenLayerMap implements CsMapController{

    protected parent:CsMap;
    protected map:Map;
    protected marker:Overlay;
    protected value:Overlay;
    protected popupContent:HTMLDivElement;

    protected dataWMSLayer: TileWMS;
    protected dataTilesLayer: (ImageLayer<Static> | TileLayer)[];
    // Definimos un diccionario vacío
    protected ncExtents: Array4Portion = {};
    protected lastSupport:string;
    protected geoLayer:CsOpenLayerGeoJsonLayer;

    protected setExtents(timesJs: CsTimesJsData, varId: string): void {
        timesJs.portions[varId].forEach((portion: string, index, array) => {
          let selector = varId + portion;
          let pxSize: number = (timesJs.lonMax[selector] - timesJs.lonMin[selector]) / (timesJs.lonNum[selector] - 1);
          this.ncExtents[portion] = [timesJs.lonMin[selector] - pxSize / 2, timesJs.latMin[selector] - pxSize / 2, timesJs.lonMax[selector] + pxSize / 2, timesJs.latMax[selector] + pxSize / 2];
        });
    }

    init(_parent: CsMap): void {

        this.parent=_parent;
        const state= this.parent.getParent().getState();
        const timesJs= this.parent.getParent().getTimesJs();
        const center:Coordinate= fromLonLat([timesJs.center['lng'],timesJs.center['lat']], olProjection);
        this.setExtents(timesJs, state.varId);
        let layers: (ImageLayer<Static> | TileLayer)[] = isWmsEnabled ? this.buildWmsLayers(state) : this.buildChunkLayers(state);

        let options:MapOptions ={
            target: 'map',
            layers: layers,
            view: new View({
              center: center,
              zoom: initialZoom,
              projection: olProjection
            })
        };

        this.map = new Map(options);
        let self=this;
        this.map.on('movestart',event=>{self.onDragStart(event)})
        this.map.on('loadend',()=>{self.onMapLoaded()})
        this.map.on('click',(event)=>{self.onClick(event)})
        this.marker=new Overlay({
          positioning: 'center-center',
          element: document.createElement('div'),
          stopEvent: false,
        })
        this.value=new Overlay({
           positioning: 'center-center',
          element: document.createElement('div'),
          stopEvent: false,
        })
        this.map.addOverlay(this.marker);
        this.map.addOverlay(this.value);
        this.marker.getElement().classList.add("marker")
        this.buildPopUp(this.value.getElement() as HTMLDivElement)
        this.map.on('pointermove',(event)=>self.onMouseMove(event))
        /*
        this.initLayers();    
        this.marker=new Marker(center);*/
        this.lastSupport="Raster"
        if (!isWmsEnabled)
          this.buildDataTilesLayers(state, timesJs);
    }

    private buildWmsLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
      this.dataWMSLayer = new TileWMS({
        url: '/geoserver/lcsc/wms',
        params: {'LAYERS': 'lcsc:value', 'FORMAT': 'image/png','TRANSPARENT': true,"TILED":true,time:state.times[state.selectedTimeIndex]},
        serverType: 'geoserver',
        // Countries have transparency, so do not fade tiles:
        transition: 0,
      });
      this.dataWMSLayer.updateParams({STYLES: undefined, SLD_BODY: this.getSld()});
      this.dataTilesLayer = [];
      let tileLayer = new TileLayer({
        source: this.dataWMSLayer
      });
      this.dataTilesLayer.push(tileLayer);
      return [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        }),
        tileLayer,
        new TileLayer({
          source: new XYZ({
            url: 'https://stamen-tiles-{a-d}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}.png'
          })
        })
      ];
    }

    private buildChunkLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
      let layers: (ImageLayer<Static> | TileLayer)[] = [];

      let terrain = new TileLayer({
        source: new OSM({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        })
      });

      let political = new TileLayer({
        source: new OSM({
          url: 'https://api.mapbox.com/styles/v1/'+mapboxMapID+'/tiles/{z}/{x}/{y}?access_token='+mapboxAccessToken
        })
      });

      this.dataTilesLayer = [];

      layers.push(terrain);
      layers.push(political);

      if (isTileDebugEnabled)
        layers.push(new TileLayer({
          source: new TileDebug(),
        }));

      return layers;
    }

    private buildPopUp(div:HTMLDivElement):void{
      div.classList.add("ol-popup");
      div.setAttribute("role","popup")
      this.popupContent=document.createElement("div");
      this.popupContent.setAttribute("role","popup-content")
      div.appendChild(this.popupContent);

    }

    private mouseMoveTo:NodeJS.Timeout;
    public onMouseMove(event:MapBrowserEvent<any>){
        if(this.mouseMoveTo){clearTimeout(this.mouseMoveTo)}
        this.mouseMoveTo=setTimeout(()=>{
            this.parent.onMouseMoveEnd(this.toCsMapEvent(event));
        },100)
    }

    private toCsMapEvent(event:MapEvent):CsMapEvent{
        let ret=new CsMapEvent();
        ret.original=event;

        
        let coord=event.frameState.viewState.center
        if(event.type=='click' || event.type=='pointermove'){
            let browserEvent=event as MapBrowserEvent<any>
            coord=browserEvent.coordinate
        }

        ret.point={x:coord[0],y:coord[1]}
        const coord4326: number[]  = proj4(olProjection, 'EPSG:4326', coord);
        ret.latLong={lat:coord4326[1],lng:coord4326[0]}
        return ret;
    }

    public onDragStart(event:MapEvent){
        let tileQueue=event.frameState["tileQueue"] as TileQueue
        if(tileQueue.getCount()==0){
          this.parent.onDragStart(this.toCsMapEvent(event))
        }
    }

    public onMapLoaded(){
        this.parent.onMapLoaded();
    }

    public onClick(event:MapEvent){
        console.log("Map on Click")
        this.parent.onMapClick(this.toCsMapEvent(event))
    }

    putMarker(pos: CsLatLong): void {
        this.marker.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
    }

    buildDataTilesLayers(state: CsViewerData, timesJs: CsTimesJsData): void {
      let app = window.CsViewerApp;

      // Remove all data layers
      this.dataTilesLayer.forEach((layer: ImageLayer<Static>) => this.map.getLayers().remove(layer));
      this.dataTilesLayer = [];

      // Add new data layers
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        let imageLayer: ImageLayer<Static> = new ImageLayer({});
        this.dataTilesLayer.push(imageLayer);
        this.map.getLayers().insertAt(1, imageLayer);
      });

      // Download and build new data layers
      let promises: Promise<number[]>[] = [];
      this.setExtents(timesJs, state.varId);
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId, portion, timesJs));
      });

      // Draw new data layers
      buildImages(promises, this.dataTilesLayer, state, timesJs, app, this.ncExtents);
    }

    setDate(dateIndex: number, state: CsViewerData): void {
        if (isWmsEnabled) {
          this.dataWMSLayer.updateParams({ "time": state.times[state.selectedTimeIndex], STYLES: undefined, SLD_BODY: this.getSld() });
          this.dataWMSLayer.refresh();
        } else
          this.buildDataTilesLayers(state, this.parent.getParent().getTimesJs());
    }

    getZoom(): number {
        return this.map.getView().getZoom();
    }

    showValue(pos: CsLatLong, value: number): void {
        if(Number.isNaN(value)){
          this.value.setPosition(undefined)
          return;
        }
        this.popupContent.textContent=this.parent.getParent().formatPopupValue(value);
        this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))

    }

    private getSld():string{
      let ret = SLD_HEADER;
      let values= this.parent.getParent().getLegendValues();
      let mgr=PaletteManager.getInstance().getPainter();
      let min = this.parent.getParent().getTimesJs().varMin[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
      let max = this.parent.getParent().getTimesJs().varMax[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
      let limit= this.parent.getParent().getState().selectionParam;
      values=values.sort((a,b)=>a - b);
      values.map((val, index) =>{ 
        let alpha=0
        if(val>limit)
          alpha=1;

        ret+='<ColorMapEntry color="'+mgr.getColorString(val,min,max)+'" quantity="'+val+'" label="'+val+'" opacity="'+alpha+'"/>'
        });

      ret+=SLD_END;
      return ret;
    }

    public getGeoJsonLayer(data:GeoJSON.Feature[],onClick:CsGeoJsonClick):CsGeoJsonLayer{
      if (this.geoLayer==undefined)
        this.geoLayer=new CsOpenLayerGeoJsonLayer (data,this.map,this,onClick);
      return this.geoLayer
    }
    public updateRender(support: string): void {
      if(support!=this.lastSupport){
  
        switch (support){
          case "Estaciones":
            this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().remove(layer));
            break;
          case "Raster":
            //this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().insertAt(1, layer));  # No es necesario insertar de nuevo las capas ya que setDate/buildDataTilesLayers lo hace antes
            break;
          case "Municipio":
          case "Provincia":
          case "CCAA":
          default:
            throw new Error("Render "+support+" not supported")
        }
        this.lastSupport=support;
      }
      if(this.geoLayer!=undefined){
        this.geoLayer.refresh();
      }
    }

    public getFeatureStyle(feature: Feature):Style {
      return this.parent.getParent().getFeatureStyle(feature);
    }
}

class CsOpenLayerGeoJsonLayer extends CsGeoJsonLayer{
  private map:Map;
  private csMap:OpenLayerMap;
  private geoLayer:Layer;
  private onClick:CsGeoJsonClick;

  private popupOverlay:Overlay
  private popupContent:HTMLDivElement;
  private geoLayerShown:boolean

  constructor(_data:GeoJSON.Feature[],_map:Map,_csMap:OpenLayerMap,_onClick:CsGeoJsonClick){
    super(_data)
    this.map=_map;
    this.csMap=_csMap;
    this.onClick=_onClick;
    this.geoLayerShown=false;

    this.map.on("click",(evt:MapBrowserEvent<any>)=>{
      if(this.geoLayer==undefined)return;
      if(!this.geoLayerShown)return;
      this.geoLayer.getFeatures(evt.pixel).then((features:FeatureLike[])=>{
        //Emtpy Array if no Feature
        if(this.popupOverlay!=undefined)this.popupOverlay.setPosition(undefined)
        if(features.length>=0 && features[0]!=undefined){
          console.log(features[0]);
          this.onClick(this.getFeature(features[0].get('id')),evt)
        }
      })
    })
  }

  public show(): void {
    if(this.geoLayerShown)return;
    if(this.geoLayer==undefined){
      let vectorSource:VectorSource = new VectorSource({
        features: new GeoJSON().readFeatures({type: 'FeatureCollection',features:this.data}),
      })
      this.geoLayer= new VectorLayer({
        source: vectorSource,
        style: (feature:Feature,n:number)=>{return this.csMap.getFeatureStyle(feature)}
      });
      setTimeout(()=>this.geoLayer.changed());
    }
    this.map.addLayer(this.geoLayer)
    this.geoLayerShown=true;
  }
  public hide(): void {
    if(!this.geoLayerShown)return;
    this.map.removeLayer(this.geoLayer)
    this.geoLayerShown=false;
    if(this.popupOverlay!=undefined)this.popupOverlay.setPosition(undefined)

  }
  public setPopupContent(popup: any, content: HTMLElement, event:any): void {
    if(this.popupOverlay==undefined){
      this.popupOverlay= new Overlay({
        positioning: 'center-center',
        element: document.createElement('div'),
        stopEvent: false,
      })
      let div = this.popupOverlay.getElement() as HTMLDivElement
      div.classList.add("ol-popup");
      div.setAttribute("role","popup")
      this.popupContent=document.createElement("div");
      this.popupContent.setAttribute("role","popup-content")
      div.appendChild(this.popupContent);
      this.map.addOverlay(this.popupOverlay)
    }
    
    let evt =event as MapBrowserEvent<any>
    if(this.popupContent.children.length>0){
      this.popupContent.removeChild(this.popupContent.firstElementChild);
    }
    this.popupContent.appendChild(content)
    this.popupOverlay.setPosition(evt.coordinate)
    //throw new Error("Method not implemented.");
  }
  public refresh():void{
    if(this.geoLayerShown) this.geoLayer.changed()
  }
}