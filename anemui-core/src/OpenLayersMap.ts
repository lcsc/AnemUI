import { Feature, Map, MapBrowserEvent, MapEvent, Overlay, TileQueue, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent } from "./CsMapTypes";
import { CsTimesJsData, CsViewerData, CsGeoJsonData, Array4Portion, ArrayData } from "./data/CsDataTypes";
import { MapOptions } from "ol/Map";
import { TileWMS, XYZ, OSM, TileDebug, ImageStatic as Static } from "ol/source";
import { Image as ImageLayer, Layer, WebGLTile as TileLayer } from 'ol/layer';
import { Coordinate } from "ol/coordinate";
import { fromLonLat, transformExtent } from "ol/proj";
import { PaletteManager } from "./PaletteManager";
import { isTileDebugEnabled, isWmsEnabled, olProjection, initialZoom, computedDataTilesLayer } from "./Env";
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { buildImages, downloadXYChunk, CsvDownloadDone, downloadXYbyRegion, getPortionForPoint, calcPixelIndex, downloadTArrayChunked } from "./data/ChunkDownloader";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import { FeatureLike } from "ol/Feature";
import { Select } from 'ol/interaction';
import { pointerMove } from 'ol/events/condition';
import { LayerManager } from "./LayerManager";
import { loadLatLogValue, loadGeoJsonData } from "./data/CsDataLoader";
import DataTileSource from "ol/source/DataTile";
import { Geometry } from 'ol/geom';
// import { renderers, defaultRenderer, getFolders } from "./tiles/Support";

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
  fill: new Fill({ color: '#00f855CC' }),
  stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
});
export const DEF_STYLE_STATIONS = new Style({ image: imgStation, })

let contourStyle = new Style({
  fill: new Fill({ color: '#ffffff00' }),
  stroke: new Stroke({ color: '#b683a1', width: 2 }),
});

const contours = ["provincia", "autonomia"]

interface FeatureManagerOptions {
  folder: string;
  map: Map;
  csMap: OpenLayerMap;
  geoJSONData: CsGeoJsonData;
  maxFeatures?: number;
  loadThreshold?: number;
}

//const SLD='<?xml version="1.0" encoding="ISO-8859-1"?>'+
const SLD_HEADER = '<StyledLayerDescriptor version="1.0.0"' +
  ' xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"' +
  ' xmlns="http://www.opengis.net/sld"' +
  ' xmlns:ogc="http://www.opengis.net/ogc"' +
  ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
  ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  '<NamedLayer>' +
  '<Name>lcsc:value</Name>' +
  '<UserStyle>' +
  '<Title>NetCDF SPEI Custom</Title>' +
  '<FeatureTypeStyle>' +
  '<Rule>' +
  '<RasterSymbolizer>' +
  '<ColorMap>';
const SLD_END = '</ColorMap>' +
  '</RasterSymbolizer>' +
  '</Rule>' +
  '</FeatureTypeStyle>' +
  '</UserStyle>' +
  '  </NamedLayer>' +
  '</StyledLayerDescriptor>'


export class OpenLayerMap implements CsMapController {

  protected parent: CsMap;
  protected map: Map;
  protected marker: Overlay;
  protected mouseMoveTo: NodeJS.Timeout;

  public value: Overlay;
  public popup: HTMLElement;
  public popupContent: HTMLDivElement;
  public defaultRenderer: string;
  public renderers: string[];

  protected dataWMSLayer: TileWMS;
  protected dataTilesLayer: (ImageLayer<Static> | TileLayer)[];

  // Definimos un diccionario vacío
  protected ncExtents: Array4Portion = {};
  protected lastSupport: string;

  protected terrainLayer: Layer;
  protected politicalLayer: Layer;
  protected uncertaintyLayer: (ImageLayer<Static> | TileLayer)[];
  protected currentFeature: Feature;
  protected glmgr: GeoLayerManager;
  protected featureLayer: CsOpenLayerGeoJsonLayer;
  protected contourLayer: CsOpenLayerGeoJsonLayer;
  protected selectInteraction: Select;
  protected hoverInteraction: Select;
  protected selectableLayers: CsOpenLayerGeoJsonLayer[]

protected setExtents(timesJs: CsTimesJsData, varId: string): void {
    const isUncertainty = varId.includes('_uncertainty');
    
    timesJs.portions[varId].forEach((portion: string, index, array) => {
        let selector = varId + portion;
        
        const lonMin = timesJs.lonMin[selector];
        const lonMax = timesJs.lonMax[selector];
        const latMin = timesJs.latMin[selector];
        const latMax = timesJs.latMax[selector];
        const lonNum = timesJs.lonNum[selector];
        const latNum = timesJs.latNum[selector];
        
        let dataExtent: number[];
        
        if (isUncertainty) {
            // UNCERTAINTY: Está en EPSG:4326, transformar a EPSG:25830
            const lonStep = (lonMax - lonMin) / (lonNum - 1);
            const latStep = (latMax - latMin) / (latNum - 1);
            
            // Extent en coordenadas geográficas SIN extensión
            const geoExtent = [lonMin, latMin, lonMax, latMax];
            
            console.log(`🌍 Uncertainty (${portion}) in EPSG:4326:`, {
                extent: geoExtent.map(v => v.toFixed(6)),
                dims: `${lonNum}x${latNum}`
            });
            
            // Transformar de EPSG:4326 a EPSG:25830
            const transformedExtent = transformExtent(
                geoExtent,
                'EPSG:4326',
                'EPSG:25830'
            );
            
            // Después de transformar, calcular el pixel size en la proyección de destino
            const projectedWidth = transformedExtent[2] - transformedExtent[0];
            const projectedHeight = transformedExtent[3] - transformedExtent[1];
            const projectedPixelX = projectedWidth / (lonNum - 1);
            const projectedPixelY = projectedHeight / (latNum - 1);
            
            // Extender medio pixel en la proyección de destino
            dataExtent = [
                transformedExtent[0] - projectedPixelX / 2,
                transformedExtent[1] - projectedPixelY / 2,
                transformedExtent[2] + projectedPixelX / 2,
                transformedExtent[3] + projectedPixelY / 2
            ];
            
            console.log(`🗺️  Uncertainty (${portion}) transformed to EPSG:25830:`, {
                extent: dataExtent.map(v => v.toFixed(2)),
                pixelSize: [projectedPixelX.toFixed(2), projectedPixelY.toFixed(2)]
            });
            
            this.ncExtents[portion] = dataExtent;
            
        } else {
            // DATOS NORMALES: YA están en EPSG:25830, NO transformar
            const pxSize = (lonMax - lonMin) / (lonNum - 1);
            
            dataExtent = [
                lonMin - pxSize / 2, 
                latMin - pxSize / 2, 
                lonMax + pxSize / 2, 
                latMax + pxSize / 2
            ];
            
            console.log(`📊 Normal (${portion}) - ALREADY in EPSG:25830:`, {
                extent: dataExtent.map(v => v.toFixed(2)),
                dims: `${lonNum}x${latNum}`,
                pixelSize: pxSize.toFixed(2),
                projection: timesJs.projection || 'default'
            });
            
            // NO TRANSFORMAR - los datos ya están en EPSG:25830
            this.ncExtents[portion] = dataExtent;
        }
    });
}


  init(_parent: CsMap): void {
    this.parent = _parent;
    const state = this.parent.getParent().getState();
    const timesJs = this.parent.getParent().getTimesJs();
    const center: Coordinate = fromLonLat([timesJs.center['lng'], timesJs.center['lat']], olProjection);
    this.setExtents(timesJs, state.varId);
    this.defaultRenderer = this.parent.getParent().getDefaultRenderer()
    this.renderers = this.parent.getParent().getRenderers()
    let layers: (ImageLayer<Static> | TileLayer)[] = isWmsEnabled ? this.buildWmsLayers(state) : this.buildChunkLayers(state);

    let options: MapOptions = {
      target: 'map',
      layers: layers,
      view: new View({
        center: center,
        zoom: initialZoom,
        projection: olProjection
      })
    };

    this.map = new Map(options);
    let self = this;
    this.map.on('movestart', event => { self.onDragStart(event) })
    this.map.on('loadend', () => { self.onMapLoaded() })
    this.map.on('click', (event) => { self.onClick(event) })
    this.map.on('moveend', self.handleMapMove.bind(this));
    this.marker = new Overlay({
      positioning: 'center-center',
      element: document.createElement('div'),
      stopEvent: false,
    })
    this.popup = document.getElementById('popUp') as HTMLElement,
      this.value = new Overlay({
        positioning: 'center-center',
        element: this.popup,
        stopEvent: false,
      })
    this.map.addOverlay(this.marker);
    this.map.addOverlay(this.value);
    this.marker.getElement().classList.add("marker")
    this.buildPopUp()
    this.map.on('pointermove', (event) => self.onMouseMove(event))
    this.lastSupport = this.parent.getParent().getDefaultRenderer()
    this.buildFeatureLayers();
    if (!isWmsEnabled) {
      this.buildDataTilesLayers(state, timesJs);
      if (state.uncertaintyLayer) this.buildUncertaintyLayer(state, timesJs);
    }
  }

  private buildWmsLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
    this.dataWMSLayer = new TileWMS({
      url: '/geoserver/lcsc/wms',
      params: { 'LAYERS': 'lcsc:value', 'FORMAT': 'image/png', 'TRANSPARENT': true, "TILED": true, time: state.times[state.selectedTimeIndex] },
      serverType: 'geoserver',
      transition: 0,
    });
    this.dataWMSLayer.updateParams({ STYLES: undefined, SLD_BODY: this.getSld() });
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

  public getParent(): CsMap {
    return this.parent;
  }

  private buildChunkLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
    let lmgr = LayerManager.getInstance();
    let layers: (ImageLayer<Static> | TileLayer)[] = [];

    let layersLength = lmgr.initBaseSelected(initialZoom)

    for (let i = 0; i <= layersLength; i++) {
      let terrain = new TileLayer({
        source: lmgr.getBaseLayerSource(i) as DataTileSource
      });
      this.terrainLayer = terrain;
      layers.push(terrain);
    }

    let political = lmgr.getTopLayerOlLayer() as TileLayer;
    this.politicalLayer = political

    this.dataTilesLayer = [];
    this.uncertaintyLayer = lmgr.getUncertaintyLayer();

    layers.push(political);

    if (isTileDebugEnabled)
      layers.push(new TileLayer({
        source: new TileDebug(),
        zIndex: 10000
      }));

    return layers;
  }

  private buildPopUp(): void {
    this.popup.setAttribute("role", "popup")
    this.popupContent = document.createElement("div");
    this.popupContent.setAttribute("role", "popup-content")
    this.popup.appendChild(this.popupContent);
  }

  public onMouseMove(event: MapBrowserEvent<any>) {
    this.hideMarker();
    if (this.mouseMoveTo) { clearTimeout(this.mouseMoveTo) }
    this.mouseMoveTo = setTimeout(() => {
      let mapEvent: CsMapEvent = this.toCsMapEvent(event)
       this.parent.getParent().getRightBar().enableLatLng(mapEvent.latLong)
      // this.onMouseMoveEnd(this.toCsMapEvent(event));
      this.onMouseMoveEnd(mapEvent);
    }, 100)
  }

  private toCsMapEvent(event: MapEvent): CsMapEvent {
    let ret = new CsMapEvent();
    ret.original = event;

    let coord = event.frameState.viewState.center
    if (event.type == 'click' || event.type == 'pointermove') {
      let browserEvent = event as MapBrowserEvent<any>
      coord = browserEvent.coordinate
    }

    ret.point = { x: coord[0], y: coord[1] }
    const coord4326: number[] = proj4(olProjection, 'EPSG:4326', coord);
    ret.latLong = { lat: coord4326[1], lng: coord4326[0] }
    return ret;
  }

public onMouseMoveEnd(event: CsMapEvent): void {
    let self = this;
    const state = this.parent.getParent().getState();
    const timesJs = this.parent.getParent().getTimesJs();
    
    loadLatLogValue(event.latLong, state, timesJs, this.getZoom())
      .then(value => {
        if (state.support == this.defaultRenderer) {
          self.showValue(event.latLong, value[0], value[1], value[2] == 0? '_can':'_pen');
        } else {
          let evt = event.original
          var features: Feature[] = [];
          this.map.forEachFeatureAtPixel(evt.pixel, (feature: Feature) => {
            features.push(feature);
          });

          let selectableFeatureIDS: string[] = []

                if (features.length > 0) {
                    const selectableFeatures = self.featureLayer.getFeatures();
                    selectableFeatures.forEach(feature => {
                        selectableFeatureIDS.push(feature.properties['id'])
                    })
                    for (var i = 0; i < features.length; ++i) {
                        if (selectableFeatureIDS.includes(features[i].getProperties()['id']))
                            self.featureLayer.showFeatureValue(self.featureLayer.indexData, features[i], event.original.pixel, event.latLong)
                    }
                }
            }
        })
        .catch(reason => {
            console.log("error: " + reason)
        })
}

private shouldShowPercentileClock(state: CsViewerData): boolean {
    console.log('Checking if should show percentile clock:', {
        climatology: state.climatology,
        escala: state.escala,
        tpSupport: state.tpSupport
    });
    
    return state.climatology && state.escala === 'Anual';
}

  public onDragStart(event: MapEvent) {
    let tileQueue = event.frameState["tileQueue"] as TileQueue
    if (tileQueue.getCount() == 0) {
      this.parent.onDragStart(this.toCsMapEvent(event))
    }
  }

  public onMapLoaded() {
    this.parent.onMapLoaded();
  }

  public onClick(event: MapEvent) {
    if (!Number.isNaN(this.parent.getParent().getState().xyValue))
      this.parent.onMapClick(this.toCsMapEvent(event))
  }

  public handleMapMove() {
    let state = this.parent.getParent().getState();
    //  if (state.support == renderers[2]) {
    if (state.support != this.defaultRenderer) {
      this.parent.getParent().update();
    }
  }

  public putMarker(pos: CsLatLong): void {
    this.marker.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
  }

  public hideMarker(): void {
    this.marker.setPosition(undefined)
  }

  public computeLayerData(t: number, varName: string, portion: string): Promise<number[]> {
    let promise: Promise<number[]> = this.parent.getParent().computeLayerData(t, varName, portion);
    return promise;
  }

  public computeFeatureLayerData(time: string, folder: string, varName: string, doneCb: CsvDownloadDone) {
    this.parent.getParent().computeFeatureLayerData(time, folder, varName, doneCb);
  }

  private getSld(): string {
    let ret = SLD_HEADER;
    let values = this.parent.getParent().getLegendValues();
    let mgr = PaletteManager.getInstance().getPainter();
    let min = this.parent.getParent().getTimesJs().varMin[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let max = this.parent.getParent().getTimesJs().varMax[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let limit = this.parent.getParent().getState().selectionParam;
    values = values.sort((a, b) => a - b);
    values.map((val, index) => {
      let alpha = 0
      if (val > limit)
        alpha = 1;
      ret += '<ColorMapEntry color="' + mgr.getColorString(val, min, max) + '" quantity="' + val + '" label="' + val + '" opacity="' + alpha + '"/>'
    });

    ret += SLD_END;
    return ret;
  }

  public getZoom(): number {
    return this.map.getView().getZoom();
  }

  public showValue(pos: CsLatLong, pixelIndex: number, value: number, portion: string, int: boolean = false): void {
    if (Number.isNaN(value)) {
      this.value.setPosition(undefined)
      return;
    }
    this.parent.getParent().getState().xyValue = value
    this.popupContent.innerHTML = this.formatPopupValue(pos, pixelIndex, portion, value, int);
    this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
    this.popupContent.style.visibility = 'visible';
    this.popup.hidden = false
  }

  public formatPopupValue(pos: CsLatLong, pixelIndex: number, portion: string,  value: number, int: boolean = false): string {
    value = int ? Math.round(value) : value
    return this.parent.getParent().formatPopupValue(' [' + pos.lat.toFixed(2) + ', ' + pos.lng.toFixed(2) + ']: ', pixelIndex, portion, value);
  }

   public onFeatureClick(feature: GeoJSON.Feature, folder:string, event: any) {
    let state = this.parent.getParent().getState()
    if(typeof state.times === 'string' && !computedDataTilesLayer) return 1
    if (feature) {
        let stParams = { 'id': feature.properties['id'], 'name': feature.properties['name'], 'folder': folder };
        if (state.support== this.renderers[0])  this.parent.getParent().showGraph({ type: 'station', stParams })
        this.parent.getParent().showGraph({ type: 'region', stParams })
    }
  }

  public refreshFeatureLayer() {
    if (this.featureLayer && this.featureLayer.refresh) {
      this.featureLayer.refresh();
    }
  }


public buildDataTilesLayers(state: CsViewerData, timesJs: CsTimesJsData): void {
    let app = window.CsViewerApp;

 

    this.safelyRemoveDataLayers();

    this.dataTilesLayer = [];

    if (!timesJs.portions[state.varId]) {
        console.warn('No portions found for varId:', state.varId);
        return;
    }

    timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        let imageLayer: ImageLayer<Static> = new ImageLayer({
            visible: true,
            opacity: 1.0,
            zIndex: 1,
            source: null
        });

        this.dataTilesLayer.push(imageLayer);
        
        // Añadir al final del array de layers (encima de todo)
        this.map.getLayers().push(imageLayer);
        
        console.log(`Layer ${index} created with zIndex:`, imageLayer.getZIndex());
    });

    let promises: Promise<number[]>[] = [];
    this.setExtents(timesJs, state.varId);

    if (computedDataTilesLayer) {
      timesJs.portions[state.varId].forEach((portion: string) => {
        promises.push(this.computeLayerData(state.selectedTimeIndex, state.varId, portion));
      });
    } else {
        timesJs.portions[state.varId].forEach((portion: string, index, array) => {
            promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId, portion, timesJs));
        });
    }

    if (this.dataTilesLayer.length > 0 && promises.length > 0) {
        buildImages(promises, this.dataTilesLayer, state, timesJs, app, this.ncExtents, false)
            .then(() => {
                console.log('=== BUILD DATA TILES COMPLETE ===');
                
                // FORZAR REFRESH COMPLETO
                this.dataTilesLayer.forEach((layer, i) => {
                    layer.setVisible(true);
                    layer.changed();
                    console.log(`Layer ${i} forced refresh, visible:`, layer.getVisible());
                });
                
                // Renderizar el mapa
                this.map.render();
                this.map.renderSync();
                
                console.log('Map render forced');
            })
            .catch(error => {
                console.error('Error building images:', error);
            });
    }
}

  // Safe layer removal method
  private safelyRemoveDataLayers(): void {
    if (this.dataTilesLayer && Array.isArray(this.dataTilesLayer)) {
      this.dataTilesLayer.forEach((layer: ImageLayer<Static> | TileLayer) => {
        if (layer && this.map) {
          try {
            // Check if layer exists in map before removing
            const layers = this.map.getLayers();
            if (layers && layers.getArray().includes(layer)) {
              layers.remove(layer);
            }
            // Dispose of layer resources if method exists
            if (typeof layer.dispose === 'function') {
              layer.dispose();
            }
          } catch (error) {
            console.warn('Error removing layer:', error);
          }
        }
      });
    }
    this.dataTilesLayer = [];
  }

public buildUncertaintyLayer(state: CsViewerData, timesJs: CsTimesJsData): void {
    let lmgr = LayerManager.getInstance();
    let app = window.CsViewerApp;

    console.log('=== BUILDING UNCERTAINTY LAYER ===');

    this.safelyRemoveUncertaintyLayers();
    this.uncertaintyLayer = [];

    const uncertaintyVarId = state.varId + '_uncertainty';

    if (!timesJs.portions[uncertaintyVarId]) {
      console.warn('No uncertainty portions found for varId:', uncertaintyVarId);
      lmgr.clearUncertaintyLayer();
      return;
    }

    // Usar setExtents que ahora detecta automáticamente uncertainty
    //this.setExtents(timesJs, uncertaintyVarId);

    timesJs.portions[uncertaintyVarId].forEach((portion: string, index, array) => {
      let imageLayer: ImageLayer<Static> = new ImageLayer({
        visible: false,
        opacity: 1.0,
        zIndex: 1000 + index,
        source: null
      });

      if (imageLayer) {
        this.uncertaintyLayer.push(imageLayer);
        this.map.addLayer(imageLayer);
        console.log(`Uncertainty layer ${index} created`);
      }
    });

    let promises: Promise<number[]>[] = [];

    timesJs.portions[uncertaintyVarId].forEach((portion: string) => {
      promises.push(downloadXYChunk(state.selectedTimeIndex, uncertaintyVarId, portion, timesJs));
    });

    if (this.uncertaintyLayer.length > 0 && promises.length > 0) {
      buildImages(promises, this.uncertaintyLayer, state, timesJs, app, this.ncExtents, true)
        .then(() => {
          console.log('=== UNCERTAINTY LAYER BUILD COMPLETE ===');
          lmgr.setUncertaintyLayer(this.uncertaintyLayer);
          lmgr.showUncertaintyLayer(false);
          this.map.render();
        })
        .catch(error => {
          console.error('Error building uncertainty images:', error);
        });
    }
}

  private safelyRemoveUncertaintyLayers(): void {
    if (this.uncertaintyLayer && Array.isArray(this.uncertaintyLayer)) {
      this.uncertaintyLayer.forEach((layer: ImageLayer<Static> | TileLayer) => {
        if (layer && this.map) {
          try {
            const layers = this.map.getLayers();
            if (layers && layers.getArray().includes(layer)) {
              layers.remove(layer);
            }
            if (typeof layer.dispose === 'function') {
              layer.dispose();
            }
          } catch (error) {
            console.warn('Error removing uncertainty layer:', error);
          }
        }
      });
    }
    this.uncertaintyLayer = [];
  }

  public buildFeatureLayers () {
        this.glmgr = GeoLayerManager.getInstance();
        let self = this
        Object.entries(this.renderers).forEach(([key, renderer]) => {
            // if(!renderer.startsWith("~") && !renderer.startsWith("-") && renderer != this.defaultRenderer){
            if(!renderer.startsWith("-") && renderer != this.defaultRenderer){  
              const folders = this.parent.getParent().getFolders(renderer)
              folders.forEach( folder =>{
                loadGeoJsonData(folder)
                .then(GeoJsonData => { 
                    self.glmgr.addGeoLayer(folder, GeoJsonData, this.map, this, (feature, event) => { this.onFeatureClick(feature, folder, event) })
                })
                .catch(error => {
                    console.error('Error: ', error);
                });
              })
            }
        } )
      }

  // Fix for setDate method
  public setDate(dateIndex: number, state: CsViewerData): void {
    try {
      if (isWmsEnabled) {
        if (this.dataWMSLayer) {
          this.dataWMSLayer.updateParams({
            "time": state.times[state.selectedTimeIndex],
            STYLES: undefined,
            SLD_BODY: this.getSld()
          });
          this.dataWMSLayer.refresh();
        }
      } else {
        this.buildDataTilesLayers(state, this.parent.getParent().getTimesJs());

        // Safely remove uncertainty layers
        this.safelyRemoveUncertaintyLayers();

        if (state.uncertaintyLayer) {
          this.buildUncertaintyLayer(state, this.parent.getParent().getTimesJs());
        }
      }
    } catch (error) {
      console.error('Error in setDate:', error);
    }
  }

  // Enhanced updateRender with better error handling
  async updateRender(support: string): Promise<void> {
    try {
      let state = this.parent.getParent().getState();

      // Safely hide existing layers
      if (this.featureLayer && typeof this.featureLayer.hide === 'function') {
        this.featureLayer.hide();
        this.featureLayer = null;
      }

      if (this.contourLayer && typeof this.contourLayer.hide === 'function') {
        this.contourLayer.hide();
        this.contourLayer = null;
      }

      switch (support) {
        case this.renderers[1]:
          break;

        case this.renderers[0]:
          await this.setupStationRenderer(state, support);
          break;

        case this.renderers[2]:
        case this.renderers[3]:
        case this.renderers[4]:
        case this.renderers[5]:
          await this.setupRegionRenderer(state, support);
          break;

        default:
          console.error("Render " + support + " not supported");
          return;
      }

      this.lastSupport = support;
      await this.finalizeRenderUpdate();

    } catch (error) {
      console.error('Error in updateRender:', error);
    }
  }

  private async setupStationRenderer(state: CsViewerData, support: string): Promise<void> {
    this.safelyRemoveDataLayers();

    const folders = this.parent.getParent().getFolders(support);
    if (!folders || folders.length === 0) {
      throw new Error(`No folders found for support: ${support}`);
    }

    this.featureLayer = this.glmgr.getGeoLayer(folders[0]);
    if (!this.featureLayer) {
      throw new Error(`Failed to get geo layer for ${folders[0]}`);
    }

    this.featureLayer.indexData = null;

    return new Promise((resolve, reject) => {
      let openSt: CsvDownloadDone = (data: any, filename: string, type: string) => {
        try {
          if (this.featureLayer && typeof this.featureLayer.show === 'function') {
            this.featureLayer.indexData = data;
            this.featureLayer.show(this.renderers.indexOf(support));
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      downloadXYbyRegion(state.times[state.selectedTimeIndex], folders[0], state.varId, openSt);
    });
  }

  private async setupRegionRenderer(state: CsViewerData, support: string): Promise<void> {
    this.safelyRemoveDataLayers();

    let folders = this.parent.getParent().getFolders(support);
    if (!folders || folders.length === 0) {
      throw new Error(`No folders found for support: ${support}`);
    }

    let dataFolder = this.selectDataFolder(folders);

    this.featureLayer = this.glmgr.getGeoLayer(dataFolder);

    if (this.featureLayer) {
      this.featureLayer.indexData = null;
      let times = typeof (state.times) === 'string' ? state.times : state.times[state.selectedTimeIndex];
      await this.initializeFeatureLayer(times, dataFolder, state.varId);
      this.setupInteractions();
    } else {
      console.warn("featureLayer is undefined for dataFolder:", dataFolder);
    }
  }

  private selectDataFolder(folders: string[]): string {
    if (folders.length <= 1) {
      return folders[0];
    }

    let zoom = this.getZoom();
    if (zoom <= 7) {
      return folders[2] || folders[0];
    } else if (zoom > 7 && zoom <= 10) {
      return folders[1] || folders[0];
    } else {
      return folders[0];
    }
  }

  private async finalizeRenderUpdate(): Promise<void> {
    if (this.featureLayer && typeof this.featureLayer.refresh === 'function') {
      this.featureLayer.refresh();
    }

    let lmgr = LayerManager.getInstance();

    // Safely update terrain layer
    let layersLength = lmgr.getBaseSelected().length;
    for (let i = 0; i < layersLength; i++) {
      let tSource = lmgr.getBaseLayerSource(i);
      if (this.terrainLayer && this.terrainLayer.getSource() !== tSource) {
        this.terrainLayer.setSource(tSource);
      }
    }

    // Safely update political layer
    let pLayer = lmgr.getTopLayerOlLayer();
    if (pLayer && this.politicalLayer !== pLayer) {
      if (this.politicalLayer && this.map.getLayers().getArray().includes(this.politicalLayer)) {
        this.map.removeLayer(this.politicalLayer);
         this.map.addLayer(pLayer);
      this.politicalLayer = pLayer;
      }
    }

    let pSource = lmgr.getTopLayerSource();
    if (this.politicalLayer && this.politicalLayer.getSource() !== pSource) {
      this.politicalLayer.setSource(pSource);
    }
  }

  async initializeFeatureLayer(time: string, folder: string, varName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let openSt: CsvDownloadDone = (data: any, filename: string, type: string) => {
        if (this.featureLayer) {
          this.featureLayer.indexData = data;
          if (this.featureLayer.show) {
            this.featureLayer.show(this.renderers.indexOf(this.lastSupport));
          }
          resolve();
        } else {
          console.error("featureLayer is undefined in initializeFeatureLayer callback");
          reject("featureLayer is undefined");
        }
      };

      if (computedDataTilesLayer) {
        // Build calculated Layer
        this.computeFeatureLayerData(time, folder, varName, openSt);
      } else {
        // Download and build new data layers
        downloadXYbyRegion(time, folder, varName, openSt);
      }

    });
  }

  private setupInteractions(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
      this.selectInteraction = null;
    }

    if (this.hoverInteraction) {
      this.map.removeInteraction(this.hoverInteraction);
      this.hoverInteraction = null;
    }

    const self = this;

    this.hoverInteraction = new Select({
      condition: pointerMove,
      style: null,
      filter: function (feature, layer) {
        const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
        if (!contourGeoLayer) {
          return true;
        }
        return layer !== contourGeoLayer;
      }
    });

    this.map.addInteraction(this.hoverInteraction);

    this.hoverInteraction.on('select', function (e) {
      e.deselected.forEach(function (feature) {
        feature.set('hover', false);
      });

      e.selected.forEach(function (feature) {
        feature.set('hover', true);
      });
    });

    const layerFilter = function (feature: any, layer: any) {
      const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
      return !contourGeoLayer || layer !== contourGeoLayer;
    };

    this.selectInteraction = new Select({
      filter: layerFilter
    });

    this.map.addInteraction(this.selectInteraction);

    this.selectableLayers = this.featureLayer ? [this.featureLayer] : [];
  }


  // Add cleanup method to prevent memory leaks
  public dispose(): void {
    let self = this
    try {
      // Clear timeouts
      if (self.mouseMoveTo) {
        clearTimeout(this.mouseMoveTo);
        this.mouseMoveTo = null;
      }

      // Remove overlays
      if (this.marker) {
        this.map.removeOverlay(this.marker);
      }
      if (this.value) {
        this.map.removeOverlay(this.value);
      }

      // Remove layers safely
      this.safelyRemoveDataLayers();
      this.safelyRemoveUncertaintyLayers();

      // Remove interactions
      if (this.selectInteraction) {
        this.map.removeInteraction(this.selectInteraction);
      }
      if (this.hoverInteraction) {
        this.map.removeInteraction(this.hoverInteraction);
      }

    } catch (error) {
      console.warn('Error during disposal:', error);
    }
  }
}

export class GeoLayerManager {
  private static instance: GeoLayerManager;
  protected geoLayers: { [key: string]: CsOpenLayerGeoJsonLayer } = {}
  private layerSelected: string[];
  private map: Map;
  private csMap: OpenLayerMap;

  public static getInstance(): GeoLayerManager {
    if (!GeoLayerManager.instance) {
      GeoLayerManager.instance = new GeoLayerManager();
    }
    return GeoLayerManager.instance;
  }

  public addGeoLayer(_folder: string, _data: CsGeoJsonData, _map: Map, _csMap: OpenLayerMap, _onClick: CsGeoJsonClick, isContour: boolean = false) {
    this.map = _map;
    this.csMap = _csMap;
    let options: FeatureManagerOptions = {
      folder: _folder,
      map: _map,
      csMap: _csMap,
      geoJSONData: _data
    }
    this.geoLayers[_folder] = new CsOpenLayerGeoJsonLayer(_folder, _data, _map, _csMap, false, _onClick)
    // if (contours.includes(_folder)) this.geoLayers[_folder+'_contour']= new CsOpenLayerGeoJsonLayer (_folder+'_contour',_data, _map, _csMap, true)
  }

  public getGeoLayer(folder: string): CsOpenLayerGeoJsonLayer {
    return this.geoLayers[folder];
  }
}

export class CsOpenLayerGeoJsonLayer extends CsGeoJsonLayer {
  private map: Map;
  private csMap: OpenLayerMap;
  private geoLayer: Layer;
  private onClick: CsGeoJsonClick;

  private popupOverlay: Overlay
  private popupContent: HTMLDivElement;
  public geoLayerShown: boolean;
  public name: string;
  public url: string;
  public source?: VectorSource;
  public isContour: boolean;
  protected currentFeature: Feature;
  public indexData: ArrayData;

  constructor(_name: string, _geoData: CsGeoJsonData, _map: Map, _csMap: OpenLayerMap, _isContour: boolean, _onClick: CsGeoJsonClick = undefined) {
    super(_geoData)
    this.name = _name;
    this.map = _map;
    this.csMap = _csMap;
    this.onClick = _onClick;
    this.geoLayerShown = false;
    this.setupEventListeners();
    this.isContour = _isContour;
  }

  private setupEventListeners(): void {
    this.map.on("click", (evt: MapBrowserEvent<any>) => {
      if (this.geoLayer == undefined) return;
      if (!this.geoLayerShown) return;
      this.geoLayer.getFeatures(evt.pixel).then((features: FeatureLike[]) => {
        if (this.popupOverlay != undefined) this.popupOverlay.setPosition(undefined)
        if (features.length >= 0 && features[0] != undefined) {
          this.onClick(this.getFeature(features[0].get('id')), evt)
        }
      })
    })

    // const pointerInteraction = new Select({
    //   condition: pointerMove,
    //   style: null  
    // });

    // this.map.addInteraction(pointerInteraction);

    // pointerInteraction.on('select', function(e) {
    //     e.deselected.forEach(function(feature:Feature) {
    //         feature.set('hover', false);
    //     });

    //     e.selected.forEach(function(feature:Feature) {
    //         feature.set('hover', true);
    //     });
    // });
  }

  public show(renderer: number): void {
    if (this.geoLayerShown) return;

    let vectorSource: VectorSource;
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();
    const geojsonFormat = new GeoJSON();

    if (!this.geoData) {
      console.error('No data available for layer');
      return;
    }

    let myFeatures;
    try {
      myFeatures = geojsonFormat.readFeatures(this.geoData, { featureProjection: olProjection });
    } catch (e) {
      console.error('Error reading features:', e);
      return;
    }

    if (!myFeatures || myFeatures.length === 0) {
      console.warn('No features found in data');
    }

    if (renderer == 0) {
      vectorSource = new VectorSource({
        features: myFeatures,
        wrapX: false
      });

      this.geoLayer = new VectorLayer({
        source: vectorSource,
        style: (feature: Feature) => this.setStationStyle(state, feature, timesJs),
        visible: true,
        zIndex: 1000
      });
    } else {
      const view = this.map.getView();
      const mapSize = this.map.getSize() || [100, 100]; // Fallback size
      const extent = view.calculateExtent(mapSize);

      const filteredFeatures = myFeatures.filter(feature => {
        const geometry = feature.getGeometry();
        if (!geometry) return false;

        const featureExtent = geometry.getExtent();
        return this.intersectsExtent(featureExtent, extent);
      });

      vectorSource = new VectorSource({
        features: filteredFeatures,
        wrapX: false
      });

      if (this.isContour) {
        this.geoLayer = new VectorLayer({
          source: vectorSource,
          style: contourStyle,
          visible: true,
          zIndex: 2000
        });
      } else {
        this.geoLayer = new VectorLayer({
          source: vectorSource,
          style: (feature: Feature) => this.setFeatureStyle(state, feature, timesJs),
          visible: true,
          zIndex: 999
        });
      }
    }

    if (this.geoLayer) {
      this.map.addLayer(this.geoLayer);
      this.geoLayer.setVisible(true);
      this.geoLayerShown = true;
    } else {
      console.error('Failed to create layer');
    }
  }

  public getGeoLayer(): Layer {
    return this.geoLayer
  }

  public hide(): void {
    if (!this.geoLayer) {
      console.warn('Cannot hide layer - geoLayer is undefined');
      return;
    }
    this.geoLayer.setVisible(false);
    this.geoLayerShown = false;
    this.map.removeLayer(this.geoLayer)
    this.geoLayer = undefined;
    if (this.popupOverlay != undefined) this.popupOverlay.setPosition(undefined)
  }

  public setPopupContent(popup: any, content: HTMLElement, event: any): void {
    if (this.popupOverlay == undefined) {
      this.popupOverlay = new Overlay({
        positioning: 'center-center',
        element: document.createElement('div'),
        stopEvent: false,
      })
      let div = this.popupOverlay.getElement() as HTMLDivElement
      div.classList.add("ol-popup");
      div.setAttribute("role", "popup")
      this.popupContent = document.createElement("div");
      this.popupContent.setAttribute("role", "popup-content")
      div.appendChild(this.popupContent);
      this.map.addOverlay(this.popupOverlay)
    }

    let evt = event as MapBrowserEvent<any>
    if (this.popupContent.children.length > 0) {
      this.popupContent.removeChild(this.popupContent.firstElementChild);
    }
    this.popupContent.appendChild(content)
    this.popupOverlay.setPosition(evt.coordinate)
  }

  public refresh(): void {
    if (this.geoLayerShown) this.geoLayer.changed()
  }

  public setStationStyle(state: CsViewerData, feature: FeatureLike, timesJs: CsTimesJsData): Style {
    let ptr = PaletteManager.getInstance().getPainter();
    let minValue = timesJs.varMin[state.varId][state.selectedTimeIndex];
    let maxValue = timesJs.varMax[state.varId][state.selectedTimeIndex];
    let targetMin: number = 5
    let targetMax: number = 20
    let currentRange = maxValue - minValue;
    let targetRange = targetMax - targetMin;
    let color: string = '#fff';
    let radius: number = 10.0;
    let id = feature.getProperties()['id']
    Object.keys(this.indexData).forEach(key => {
      if (key == id) {
        color = ptr.getColorString(this.indexData[key], minValue, maxValue)
        radius = Math.abs(targetMin + ((this.indexData[key] - minValue) / currentRange) * targetRange)
      }
    });

    const isHovered = feature.get('hover');

    let imgStation: CircleStyle = new CircleStyle({
      radius: radius,
      fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
      stroke: new Stroke({ color: '#999', width: 1 }),
    });
    return new Style({ image: imgStation, })
  }

  public setFeatureStyle(state: CsViewerData, feature: Feature, timesJs: CsTimesJsData): Style {
    let min: number = Number.MAX_VALUE;
    let max: number = Number.MIN_VALUE;

    Object.values(this.indexData).forEach((value) => {
      if (!isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });

    let color: string = '#fff';
    let id = feature.getProperties()['id'];
    let ptr = PaletteManager.getInstance().getPainter();

    Object.keys(this.indexData).forEach(key => {
      if (key.includes(id)) {
        color = ptr.getColorString(this.indexData[key], min, max);
      }
    });

    const isHovered = feature.get('hover');

    if (isHovered) this.map.getTargetElement().style.cursor = 'pointer';
    else this.map.getTargetElement().style.cursor = '';
    return new Style({
      fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
      stroke: new Stroke({
        color: '#999',
      }),
    });
  }

  private intersectsExtent(featureExtent: number[], viewExtent: number[]): boolean {
    return !(
      featureExtent[2] < viewExtent[0] || // right < left
      featureExtent[0] > viewExtent[2] || // left > right
      featureExtent[3] < viewExtent[1] || // top < bottom
      featureExtent[1] > viewExtent[3]    // bottom > top
    );
  }

  public showFeatureValue(data: any, feature: any, pixel: any, pos: CsLatLong): void {
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();
    let value: string;
    if (feature) {
      if (state.support == this.csMap.renderers[0]) feature.setStyle(this.setStationStyle(state, feature, timesJs))
      else feature.setStyle(this.setFeatureStyle(state, feature, timesJs));
      this.csMap.popupContent.style.left = pixel[0] + 'px';
      this.csMap.popupContent.style.top = pixel[1] + 'px';
      this.csMap.popup.hidden = false
      if (feature !== this.currentFeature) {
        let id = feature.getProperties()['id']
        Object.keys(data).forEach(key => {
          if (key.includes(id)) {
            value = data[key]
          }
        });
        this.csMap.popupContent.style.visibility = 'visible';
        this.csMap.popupContent.innerText = feature.get('name') + ': ' + parseFloat(value).toFixed(2);
        this.csMap.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
      }
    } else {
      this.csMap.popupContent.style.visibility = 'hidden';
      this.csMap.popup.hidden = true
    }
    if (this.currentFeature instanceof Feature) {
      if (state.support == this.csMap.renderers[0]) this.currentFeature.setStyle(this.setStationStyle(state, this.currentFeature, timesJs))
      else this.currentFeature.setStyle(this.setFeatureStyle(state, this.currentFeature, timesJs));
    }
    this.currentFeature = feature;
  };

  public highLightColor(hex: string, lum: number): string {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).slice(c.length);
    }
    return rgb;
  }
}


// interface FeatureManagerOptions {
//   map: Map;
//   maxFeatures?: number;
//   loadThreshold?: number;
//   source: VectorSource;
//   geoJSONData: any; // Your GeoJSON data
// }
