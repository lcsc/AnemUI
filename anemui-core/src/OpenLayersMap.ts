import { Feature, Map, MapBrowserEvent, MapEvent, Overlay, TileQueue, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent } from "./CsMapTypes";
import { CsTimesJsData, CsViewerData, CsGeoJsonData, Array4Portion } from "./data/CsDataTypes";
import { MapOptions } from "ol/Map";
import { TileWMS, XYZ, OSM, TileDebug, ImageStatic as Static } from "ol/source";
import { Image as ImageLayer, Layer, WebGLTile as TileLayer } from 'ol/layer';
import { Coordinate } from "ol/coordinate";
import { fromLonLat, toLonLat, transform, Projection } from "ol/proj";
import { PaletteManager } from "./PaletteManager";
import { isTileDebugEnabled, isWmsEnabled, olProjection, initialZoom } from "./Env";
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { buildImages, downloadXYChunk, CsvDownloadDone, downloadXYbyRegion } from "./data/ChunkDownloader";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
import { FeatureLike } from "ol/Feature";
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { Select } from 'ol/interaction';
import { pointerMove } from 'ol/events/condition';
import { LayerManager } from "./LayerManager";
import { loadRegionFeatures, loadGeoJsonData } from "./data/CsDataLoader";
import DataTileSource from "ol/source/DataTile";
import { Geometry } from 'ol/geom';
import { renderers, defaultRenderer } from "./tiles/Support";

// Define alternative projections
proj4.defs([
  ['EPSG:25830',
    '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs'],
  ['EPSG:23030',
    '+proj=utm +zone=30 +ellps=intl +units=m +no_defs +type=crs'],  
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

const style = new Style({
  fill: new Fill({
    color: '#eeeeee',
  }),
  stroke: new Stroke({
    color: 'rgba(255, 255, 255, 0.7)',
    width: 2,
  }),
});


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
    protected popup: HTMLElement;
    protected popupContent:HTMLDivElement;

    protected dataWMSLayer: TileWMS;
    protected dataTilesLayer: (ImageLayer<Static> | TileLayer)[];

    // Definimos un diccionario vacío
    protected ncExtents: Array4Portion = {};
    protected lastSupport:string;
    
    protected terrainLayer:Layer;
    protected politicalLayer:Layer;
    protected uncertaintyLayer: (ImageLayer<Static> | TileLayer)[];
    protected currentFeature: Feature;
    protected glmgr: GeoLayerManager;
    protected featureLayer: CsOpenLayerGeoJsonLayer;
     
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
        this.popup = document.getElementById('popUp') as HTMLElement,
        this.value=new Overlay({
           positioning: 'center-center',
          // element: document.createElement('div'),
          element: this.popup,
          stopEvent: false,
        })
        this.map.addOverlay(this.marker);
        this.map.addOverlay(this.value);
        this.marker.getElement().classList.add("marker")
        this.buildPopUp(/* this.value.getElement() as HTMLDivElement */)
        this.map.on('pointermove',(event)=>self.onMouseMove(event))
        /*
        this.initLayers();    
        this.marker=new Marker(center);*/
        this.lastSupport = defaultRenderer
        if (!isWmsEnabled) {
          this.buildDataTilesLayers(state, timesJs);
            if (state.uncertaintyLayer) this.buildUncertaintyLayer(state, timesJs);
        }
        this.buildFeatureLayers();
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
      this.uncertaintyLayer = [];
      let tileLayer = new TileLayer({
        source: this.dataWMSLayer
      });
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

    public getParent():CsMap{
        return this.parent;
    }

    private buildChunkLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
      let lmgr = LayerManager.getInstance();
      let layers: (ImageLayer<Static> | TileLayer)[] = [];

      let layersLength =  lmgr.initBaseSelected(initialZoom)

      for (let i = 0; i <= layersLength; i++) {
        let terrain = new TileLayer({
          source: lmgr.getBaseLayerSource(i) as DataTileSource
        });
        this.terrainLayer=terrain;
        layers.push(terrain);
      }

      let political = lmgr.getTopLayerOlLayer() as TileLayer;
      this.politicalLayer=political

      this.dataTilesLayer = [];
      this.uncertaintyLayer = lmgr.getUncertaintyLayer();
     
      layers.push(political);

      if (isTileDebugEnabled)
        layers.push(new TileLayer({
          source: new TileDebug(),
        }));

      return layers;
     
    }

    private buildPopUp():void{
      this.popup.setAttribute("role","popup")
      this.popupContent=document.createElement("div");
      this.popupContent.setAttribute("role","popup-content")
      this.popup.appendChild(this.popupContent);
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
        this.parent.onMapClick(this.toCsMapEvent(event))
    }

    public putMarker(pos: CsLatLong): void {
        this.marker.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
    }

    public buildDataTilesLayers(state: CsViewerData, timesJs: CsTimesJsData): void {
      let app = window.CsViewerApp;

      // Remove all data layers
      this.dataTilesLayer.forEach((layer: ImageLayer<Static>) => this.map.getLayers().remove(layer));
      this.dataTilesLayer = [];

      // Add new data layers
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        let imageLayer: ImageLayer<Static> = new ImageLayer({});
        this.dataTilesLayer.push(imageLayer);
        this.map.getLayers().insertAt(this.map.getLayers().getLength() - 1, imageLayer);
      });

      // Download and build new data layers
      let promises: Promise<number[]>[] = [];
      this.setExtents(timesJs, state.varId);
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId, portion, timesJs));
      });

      // Draw new data layers
      buildImages(promises, this.dataTilesLayer, state, timesJs, app, this.ncExtents, false);
    }

    public buildUncertaintyLayer(state: CsViewerData, timesJs: CsTimesJsData): void {
        let lmgr = LayerManager.getInstance();
        let app = window.CsViewerApp;
        
        this.uncertaintyLayer = lmgr.getUncertaintyLayer();
      
        // Add uncertainty layers
        timesJs.portions[state.varId + '_uncertainty'].forEach((portion: string, index, array) => {
          let imageLayer: ImageLayer<Static> = new ImageLayer({});
          this.uncertaintyLayer.push(imageLayer);
          this.map.getLayers().insertAt(this.map.getLayers().getLength() - 1, imageLayer);
        });

        // Download and build new uncertainty layers
        let promises: Promise<number[]>[] = [];
        this.setExtents(timesJs, state.varId + '_uncertainty');
        timesJs.portions[state.varId + '_uncertainty'].forEach((portion: string, index, array) => {
          promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId + '_uncertainty', portion, timesJs));
        });

        // Draw new data layers
        buildImages(promises, this.uncertaintyLayer, state, timesJs, app, this.ncExtents, true);
        lmgr.showUncertaintyLayer(false); // ---------------- Por defecto desactivada
    } 

    public setDate(dateIndex: number, state: CsViewerData): void {
        if (isWmsEnabled) {
          this.dataWMSLayer.updateParams({ "time": state.times[state.selectedTimeIndex], STYLES: undefined, SLD_BODY: this.getSld() });
          this.dataWMSLayer.refresh();
        } else {
          this.buildDataTilesLayers(state, this.parent.getParent().getTimesJs());
          // Remove all uncertainty layers
          this.uncertaintyLayer.forEach((layer: ImageLayer<Static>) => this.map.getLayers().remove(layer));
          this.uncertaintyLayer = [];
          if (state.uncertaintyLayer) this.buildUncertaintyLayer(state, this.parent.getParent().getTimesJs());
        }
    }

    public getZoom(): number {
        return this.map.getView().getZoom();
    }

    public showValue(pos: CsLatLong, value: number): void {
        if(Number.isNaN(value)){
          this.value.setPosition(undefined)
          return;
        }
        this.popupContent.textContent=this.formatPopupValue(pos,value);
        // this.popupContent.textContent=this.parent.getParent().formatPopupValue(value);
        this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
        this.popupContent.style.visibility = 'visible';
        this.popup.hidden = false
    }

    public formatPopupValue(pos: CsLatLong, value: number): string {
      // return 'Valor en [' + pos.lat.toFixed(2) + ', ' + pos.lng.toFixed(2) + ']: '  + value
      return this.parent.getParent().formatPopupValue(' [' + pos.lat.toFixed(2) + ', ' + pos.lng.toFixed(2) + ']: ', value);
    }

    public getFeatureStyle(feature: Feature): Style {
      console.log('All feature properties:', feature.getProperties());
    
    // Check if properties exist with different cases
    const showColor = feature.get('showcolor') || feature.get('showColor') || feature.get('SHOWCOLOR');
    const color = feature.get('color') || feature.get('Color') || feature.get('COLOR');
    
    console.log('showColor value:', showColor);
    console.log('color value:', color);
      
      // const showColor = feature.get('showcolor');
      // console.log(showColor);
      // const color = feature.get('COLOR');
      style.getFill().setColor(color);
        return style; 
    }

    public showFeatureValue (data: any, pixel: any, pos: CsLatLong, target:any):void {
      let value: string;
      const feature = target.closest('.ol-control')
        ? undefined
        : this.map.forEachFeatureAtPixel(pixel, function (feature: Feature) {
            return feature;
          });
      if (feature) {
        feature.setStyle(this.setFeatureStyle(feature));
        this.popupContent.style.left = pixel[0] + 'px';
        this.popupContent.style.top = pixel[1] + 'px';
        this.popup.hidden = false
        if (feature !== this.currentFeature) {
          let id = 'X'+feature.getProperties()['id']
          Object.keys(data).forEach(key => {
              if (key == id) {
                  value = data[key]
              } 
          });
          this.popupContent.style.visibility = 'visible';
          this.popupContent.innerText = feature.get('name') +': ' + value ;
          this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
        }
      } else {
        this.popupContent.style.visibility = 'hidden';
        this.popup.hidden = true
      }
      if (this.currentFeature instanceof  Feature) {
        this.currentFeature.setStyle(this.setFeatureStyle(this.currentFeature))
      }
      this.currentFeature = feature;
    };

    public buildFeatureLayers () {
      this.glmgr = GeoLayerManager.getInstance();
      renderers.name.forEach( renderer => {
          if(!renderer.startsWith("~") && renderer != defaultRenderer){
            loadGeoJsonData(renderers.folder[renderers.name.indexOf(renderer)])
              .then(data => { 
                  this.glmgr.addGeoLayer(renderer, data, this.map, this, (feature, event) => { this.onFeatureClick(feature, event) })
                  if (renderer == renderers.name[0]) this.parent.getParent().initStationsLayer(this.glmgr.getGeoLayer(renderer))
              })
              .catch(error => {
                  console.error('Error: ', error);
              });
          }
      } )
    }

    public onFeatureClick(feature: GeoJSON.Feature, event: any) {
      let state = this.parent.getParent().getState()
      if(typeof state.times === 'string') return 1
      if (feature) {
          let stParams = { 'id': feature.properties['id'], 'name': feature.properties['name'] };
          if (state.support== renderers.name[0]) this.parent.getParent().showGraphBySt(stParams)
          else this.parent.getParent().showGraphByRegion(renderers.name.indexOf(state.support), stParams)
      }
    }

    public setFeatureStyle(feature: Feature): Style {
      const state= this.parent.getParent().getState();
      const timesJs= this.parent.getParent().getTimesJs();
      let min = timesJs.varMin[state.varId][state.selectedTimeIndex];
      let max = timesJs.varMax[state.varId][state.selectedTimeIndex];
      let color: string = '#fff';
      let id = 'X'+feature.getProperties()['id'];
      let ptr = PaletteManager.getInstance().getPainter();
      
      Object.keys(state.actionData).forEach(key => {
          if (key == id) {
              color = ptr.getColorString(state.actionData[key],min,max);
          } 
      });

      const isHovered = feature.get('hover');
      
      return new Style({
          fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
          stroke: new Stroke({ 
              // color: isHovered ? '#ffffff' : '#000000', 
              color: '#999', 
          }),
      });
    }

    public highLightColor(hex: string, lum: number): string {
      hex = String(hex).replace(/[^0-9a-f]/gi, '');
      if (hex.length < 6) {
          hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      }
      lum = lum || 0;
      var rgb = "#", c, i;
      for (i = 0; i < 3; i++) {
          c = parseInt(hex.slice(i*2, i*2+2), 16);
          c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
          rgb += ("00"+c).slice(c.length);
      }
      return rgb;
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

    public updateRender(support: string): void {
        let state= this.parent.getParent().getState();
        let timesJs= this.parent.getParent().getTimesJs();
        if (this.featureLayer != undefined) {   /// ??????????
          this.featureLayer.hide()
        } 
        switch (support){
          case defaultRenderer:
            break;      
          case renderers.name[0]:
            // this.featureLayer = this.glmgr.getGeoLayer(support)
            // this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().remove(layer));
            // this.featureLayer.show(0);
            // break;
          case renderers.name[2]: 
          case renderers.name[3]: 
          case renderers.name[4]:
            this.featureLayer = this.glmgr.getGeoLayer(support)
            this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().remove(layer));
            let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
                state.actionData = data
                this.featureLayer.show(renderers.name.indexOf(support));
            }
            downloadXYbyRegion(state.times[state.selectedTimeIndex], renderers.name.indexOf(support), state.varId, open);
            break;         
          default:
            throw new Error("Render "+support+" not supported")
        }
      this.lastSupport=support;
      if(this.featureLayer!=undefined){
        this.featureLayer.refresh();
      }
      let lmgr = LayerManager.getInstance();
      let layersLength =  lmgr.getBaseSelected().length
      for (let i = 0; i < layersLength; i++) {
        let tSource = lmgr.getBaseLayerSource(i);
        if(this.terrainLayer.getSource()!=tSource){
          this.terrainLayer.setSource(tSource);
        }
      }
      let pLayer=lmgr.getTopLayerOlLayer();
      if(pLayer!=this.politicalLayer){
        this.map.removeLayer(this.politicalLayer)
        this.map.addLayer(pLayer)
        this.politicalLayer=pLayer;
      }
      let pSource = lmgr.getTopLayerSource();
      if(this.politicalLayer.getSource()!=pSource){
        this.politicalLayer.setSource(lmgr.getTopLayerSource());
      }
    }
}

export class GeoLayerManager {
  private static instance: GeoLayerManager;
  protected geoLayers: { [key: string]: CsOpenLayerGeoJsonLayer } = {}
  private layerSelected:string[];
  private map:Map;
  private csMap:OpenLayerMap;

  public static getInstance(): GeoLayerManager {
      if (!GeoLayerManager.instance) {
          GeoLayerManager.instance = new GeoLayerManager();
      }
      return GeoLayerManager.instance;
  }

  public addGeoLayer(region:string, data:CsGeoJsonData, _map:Map,_csMap:OpenLayerMap,_onClick:CsGeoJsonClick){
    this.map=_map;
    this.csMap=_csMap;
    this.geoLayers[region]= new CsOpenLayerGeoJsonLayer (data, _map, _csMap, _onClick)
  }

  public getGeoLayer(region: string):CsOpenLayerGeoJsonLayer{
    return this.geoLayers[region];
  }
}

export class CsOpenLayerGeoJsonLayer extends CsGeoJsonLayer{
  private map:Map;
  private csMap:OpenLayerMap;
  private geoLayer:Layer;
  // private geoLayers:Layer[];
  private onClick:CsGeoJsonClick;

  private popupOverlay:Overlay
  private popupContent:HTMLDivElement;
  public geoLayerShown:boolean;
  public name:string;
  public url:string; 
  public source?: VectorSource;
  public geoJsonData: any;
  private lastZoom: number;

  constructor(_data:CsGeoJsonData,_map:Map,_csMap:OpenLayerMap,_onClick:CsGeoJsonClick){
    super(_data)
    this.map=_map;
    this.csMap=_csMap;
    this.onClick=_onClick;
    this.geoLayerShown=false;
    this.geoJsonData = _data
    this.lastZoom = _map.getView().getZoom() || 0;

    this.setupEventListeners();
  }


  private setupEventListeners(): void { 
    this.map.on("click",(evt:MapBrowserEvent<any>)=>{
      if(this.geoLayer==undefined)return;
      if(!this.geoLayerShown)return;
      this.geoLayer.getFeatures(evt.pixel).then((features:FeatureLike[])=>{
        //Emtpy Array if no Feature
        if(this.popupOverlay!=undefined)this.popupOverlay.setPosition(undefined)
        if(features.length>=0 && features[0]!=undefined){
          this.onClick(this.getFeature(features[0].get('id')),evt)
        }
      })
    })

    this.map.on('moveend', () => {
      if(this.geoLayer==undefined)return;
      if(!this.geoLayerShown) return;
      const currentZoom = this.map.getView().getZoom() || 0;
      if (currentZoom != this.lastZoom) {
        this.show(0) 
      }
      this.lastZoom = currentZoom;
    });

    const pointerInteraction = new Select({
      condition: pointerMove,
      style: null  // Let the layer's style function handle it
    });
    
    this.map.addInteraction(pointerInteraction);
    
    // Handle hover state
    pointerInteraction.on('select', function(e) {
        // Remove hover state from previously hovered features
        e.deselected.forEach(function(feature:Feature) {
            feature.set('hover', false);
        });
        
        // Add hover state to newly hovered features
        e.selected.forEach(function(feature:Feature) {
            feature.set('hover', true);
        });
    });
  }

  public show(renderer: number): void {
    if (this.geoLayerShown) return;

<<<<<<< HEAD
    const geojsonFormat = new GeoJSON();
    if (this.geoJsonData.type !== 'FeatureCollection' || !Array.isArray(this.geoJsonData.features)) {
      return; 
    }
    const bounds = this.map.getView().calculateExtent(this.map.getSize());
    const vectorSource = new VectorSource({
        strategy: bboxStrategy,
        features: geojsonFormat.readFeatures(this.data,{featureProjection: olProjection})
        .filter( function(feature) {
          if (!feature.getGeometry()) {
              return false;
          }
          return feature.getGeometry().intersectsExtent(bounds)})
        })
    this.geoLayer = new VectorLayer({
        source: vectorSource,
        style: (feature:Feature)=>{return this.csMap.setFeatureStyle(feature)},
    });
=======
    let vectorSource:VectorSource;
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();

    if (renderer == 0) {  ///---- PROVISIONAL, UNIFICAR CON EL RESTO
      vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures({type: 'FeatureCollection',features:this.data}),
      })
      this.geoLayer= new VectorLayer({
        source: vectorSource,
        style: (feature:Feature,n:number)=>{return this.setStationStyle(feature, state, timesJs)},
      });

    } else {
      console.log("Datos capa:", this.data);

      const geojsonFormat = new GeoJSON();
      if (this.geoJsonData.type !== 'FeatureCollection' || !Array.isArray(this.geoJsonData.features)) {
        return; 
      }

      vectorSource = new VectorSource({
          features: geojsonFormat.readFeatures(this.data,{featureProjection: olProjection})
          // .filter(function(feature) {
          //   return bounds.intersects(feature.getGeometry().getExtent()) // ---- definir bounds = límites bbox
      });

      this.geoLayer = new VectorLayer({
          source: vectorSource,
          style: (feature:Feature)=>{return this.setFeatureStyle(feature, state, timesJs)},
      });

    } 
    

    

>>>>>>> 9b143ed (Adaptación visores AEMET a GUI nueva)
    this.map.addLayer(this.geoLayer);
    this.geoLayerShown = true;
  }

  public hide(): void {
    // if(!this.geoLayerShown)return;
    this.map.removeLayer(this.geoLayer)
    this.geoLayer = undefined;
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
<<<<<<< HEAD
}

interface FeatureManagerOptions {
  map: Map;
  maxFeatures?: number;
  loadThreshold?: number;
  source: VectorSource;
  geoJSONData: any; // Your GeoJSON data
}

class DynamicFeatureManager {
  private map: Map;
  private source: VectorSource;
  private maxFeatures: number;
  private loadThreshold: number;
  private loadedFeatures: Set<string> = new Set();
  private geoJSONFormat: GeoJSON;
  private allFeatures: Feature<Geometry>[];

  constructor(options: FeatureManagerOptions) {
    this.map = options.map;
    this.source = options.source;
    this.maxFeatures = options.maxFeatures || 1000;
    this.loadThreshold = options.loadThreshold || 0.8;
    this.geoJSONFormat = new GeoJSON();
    
    // Parse all features from GeoJSON
    this.allFeatures = this.geoJSONFormat.readFeatures(options.geoJSONData, {
      featureProjection: 'EPSG:3857',    // Web Mercator (what OpenLayers uses)
      dataProjection: 'EPSG:4326'        // WGS 84 (standard for GeoJSON)
    });

    // Assign IDs to features if they don't have them
    this.allFeatures.forEach((feature, index) => {
      if (!feature.getId()) {
        feature.setId(`feature-${index}`);
      }
    });

    // Bind event listeners
    this.map.on('moveend', this.handleMapMove.bind(this));
    
    // Initial load
    this.handleMapMove();
  }

  private handleMapMove() {
    const view = this.map.getView();
    const extent = view.calculateExtent(this.map.getSize());
    const zoom = view.getZoom() || 0;

    // Clean up features outside view bounds
    this.cleanupFeatures(extent);

    // Load new features within bounds
    this.loadFeaturesInView(extent, zoom);
  }

  private cleanupFeatures(currentExtent: number[]) {
    const features = this.source.getFeatures();
    
    features.forEach(feature => {
      const featureExtent = feature.getGeometry()?.getExtent();
      const featureId = feature.getId()?.toString();
      
      if (featureExtent && featureId) {
        // Check if feature is outside current view extent
        if (!this.intersectsExtent(featureExtent, currentExtent)) {
          this.source.removeFeature(feature);
          this.loadedFeatures.delete(featureId);
        }
      }
    });
  }

  private loadFeaturesInView(extent: number[], zoom: number) {
    // Filter features that intersect with current view extent
    const featuresInView = this.allFeatures.filter(feature => {
      const featureExtent = feature.getGeometry()?.getExtent();
      return featureExtent && this.intersectsExtent(featureExtent, extent);
    });

    // Apply zoom-based filtering if needed
    const filteredFeatures = this.filterFeaturesByZoom(featuresInView, zoom);

    // Add features not already loaded
    filteredFeatures.forEach(feature => {
      const featureId = feature.getId()?.toString();
      if (featureId && !this.loadedFeatures.has(featureId)) {
        if (this.source.getFeatures().length < this.maxFeatures) {
          this.source.addFeature(feature);
          this.loadedFeatures.add(featureId);
        }
      }
    });
  }

  private filterFeaturesByZoom(features: Feature<Geometry>[], zoom: number): Feature<Geometry>[] {
    // Example zoom-based filtering logic
    // Adjust these thresholds based on your needs
    if (zoom < 10) {
      // At lower zoom levels, maybe only show larger or more important features
      return features.filter(feature => {
        // Add your filtering logic here
        // Example: only show features with certain properties
        const properties = feature.getProperties();
        return properties.importance === 'high';
      });
    }
    return features;
  }

  private intersectsExtent(featureExtent: number[], viewExtent: number[]): boolean {
    return !(
      featureExtent[2] < viewExtent[0] || // right < left
      featureExtent[0] > viewExtent[2] || // left > right
      featureExtent[3] < viewExtent[1] || // top < bottom
      featureExtent[1] > viewExtent[3]    // bottom > top
    );
  }

  // Public methods for manual control
  public refresh() {
    this.handleMapMove();
  }

  public clear() {
    this.source.clear();
    this.loadedFeatures.clear();
  }
}
=======

  public setStationStyle(feature: FeatureLike, state: CsViewerData, timesJs: CsTimesJsData): Style {
    let varId = state.varId + "_" + state.selectionParam +"y";
    let val = feature.getProperties()[varId];
    let ptr = PaletteManager.getInstance().getPainter();
    let min = timesJs.varMin[state.varId][state.selectedTimeIndex];
    let max = timesJs.varMax[state.varId][state.selectedTimeIndex];
    let imgStation: CircleStyle = new CircleStyle({
        radius: Math.abs( (val - min) / (max - min) * 10),
        fill: new Fill({ color: ptr.getColorString(val,min,max) }),
        stroke: new Stroke({ color: '#000000', width: 1 }),
    });

    return new Style({ image: imgStation, })
}

  public setFeatureStyle(feature: Feature, state: CsViewerData, timesJs: CsTimesJsData): Style {
    let min = timesJs.varMin[state.varId][state.selectedTimeIndex];
    let max = timesJs.varMax[state.varId][state.selectedTimeIndex];
    let color: string = '#fff';
    let id = 'X'+feature.getProperties()['id']
    let ptr = PaletteManager.getInstance().getPainter();
    Object.keys(state.actionData).forEach(key => {
        if (key == id) {
            color = ptr.getColorString(state.actionData[key],min,max)
        } 
    });
    return new Style({
        fill: new Fill({ color: color }),
        stroke: new Stroke({ color: '#000000', width: 1 }),
    });
  }

}
>>>>>>> 9b143ed (Adaptación visores AEMET a GUI nueva)
