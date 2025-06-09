import { addChild, mount } from "tsx-create-element";
import { MainFrame } from "./ui/MainFrame";
// import { MenuBarListener } from "./ui/MenuBar";
// import { MenuBar } from './ui/MenuBar';
import { MenuBar, MenuBarListener } from './ui/MenuBar'; 
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { DownloadFrame, DownloadIframe, DownloadOptionsDiv } from "./ui/DownloadFrame";
import LayerFrame from './ui/LayerFrame'
import PaletteFrame from "./ui/PaletteFrame";  
import { CsMapEvent, CsMapListener } from "./CsMapTypes";
import { DateSelectorFrame, DateFrameListener } from "./ui/DateFrame";
import { loadLatLogValue, loadLatLongData } from "./data/CsDataLoader";
import { CsLatLongData, CsTimesJsData, CsViewerData } from "./data/CsDataTypes";
import { CsGraph } from "./ui/Graph";
import { isKeyCloakEnabled, locale, avoidMinimize, maxWhenInf, minWhenInf, hasDownload, hasCookies, computedDataTilesLayer } from "./Env";
import { InfoDiv, InfoFrame } from "./ui/InfoPanel";
import { CsvDownloadDone, browserDownloadFile, downloadCSVbySt, downloadTimebyRegion, getPortionForPoint } from "./data/ChunkDownloader";
import { downloadTCSVChunked, downloadCSVbyRegion } from "./data/ChunkDownloader";
import { downloadUrl } from "./data/UrlDownloader";
import { DEF_STYLE_STATIONS, CsOpenLayerGeoJsonLayer, OpenLayerMap } from "./OpenLayersMap";
import { LoginFrame } from "./ui/LoginFrame";
import { PaletteManager } from "./PaletteManager";
import { fromLonLat } from "ol/proj";
import Dygraph from "dygraphs";
import { Style } from 'ol/style.js';
import GeoJSON from 'ol/format/GeoJSON';
import { FeatureLike } from "ol/Feature";
import LeftBar from "./ui/LeftBar"; 
import RightBar from "./ui/RightBar"; 
import Translate from "./language/translate";
import { renderers, defaultRenderer, folders } from "./tiles/Support";
import CsCookies from "./cookies/CsCookies";


export const zip = require("@zip.js/zip.js");

require("bootstrap-datepicker/dist/css/bootstrap-datepicker3.css")

declare global {
    interface Window { CsViewerApp: BaseApp; }
}

const INITIAL_STATE: CsViewerData = {
    support: defaultRenderer,
    tpSupport: undefined,
    varId: "",
    varName: "",
    times: undefined,
    selectedTimeIndex: 0,
    legendTitle: "",
    selection: "",
    selectionParam: 0,
    selectionParamEnable: false,
    climatology: false,
    uncertaintyLayer: false,
    season: "",
    month: "",
    timeSeriesData: undefined,
    computedData: {}
}

export const TP_SUPPORT_CLIMATOLOGY = 'Climatología'
export const UNCERTAINTY_LAYER = '_uncertainty'
const LEYEND_TITLE = "Leyenda"
const STR_ALL = "Todo"

export abstract class BaseApp implements CsMapListener, MenuBarListener, DateFrameListener {

    protected menuBar: MenuBar;
    protected leftBar: LeftBar;
    protected rightBar: RightBar;
    protected csMap: CsMap;
    protected mainFrame: MainFrame;
    protected downloadFrame: DownloadFrame;
    protected layerFrame: LayerFrame;
    protected paletteFrame: PaletteFrame;
    protected dateSelectorFrame: DateSelectorFrame;
    protected lastLlData: CsLatLongData;
    protected graph: CsGraph
    protected infoFrame: InfoFrame
    protected loginFrame: LoginFrame

    protected state: CsViewerData;
    protected timesJs: CsTimesJsData;
    protected infoDiv: InfoDiv;
    protected downloadOptionsDiv: DownloadOptionsDiv;

    protected stationsLayer: CsOpenLayerGeoJsonLayer
    
    protected translate: Translate;
    protected cookies: CsCookies;

    protected constructor() {
        this.menuBar = new MenuBar(this, this);
        // this.leftBar = new LeftBar(this, this) // - VERSIÓN SIDEBAR_00  (DROPDOWNS)
        this.leftBar = new LeftBar(this) // - VERSIÓN SIDEBAR_01  (BOTONES CAPAS)
        this.rightBar = new RightBar(this)

        this.csMap = new CsMap(this, new OpenLayerMap(), this);

        this.mainFrame = new MainFrame(this);
        this.downloadFrame = new DownloadFrame(this);
        this.layerFrame = new LayerFrame(this) 
        this.paletteFrame = new PaletteFrame(this);
        this.dateSelectorFrame = new DateSelectorFrame(this, this);
        this.graph = new CsGraph(this);
        this.infoFrame = new InfoFrame(this);

        this.downloadOptionsDiv = new DownloadOptionsDiv(this, "downloadOptionsDiv")
        window.CsViewerApp = this;
        
        this.translate = Translate.getInstance();
        
        if (isKeyCloakEnabled) this.loginFrame = new LoginFrame(this);
        if (hasCookies) this.cookies = new CsCookies(this);
    }

    public getMenuBar(): MenuBar {
        return this.menuBar;
    }

    public getSideBar(): LeftBar {
        return this.leftBar;
    }

    public getMap(): CsMap {
        return this.csMap
    }

    public getDateSelectorFrame(): DateSelectorFrame {
        return this.dateSelectorFrame;
    }

    public getGraph(): CsGraph {
        return this.graph;
    }

    public getPaletteFrame(): PaletteFrame {
        return this.paletteFrame;
    }

    public getTranslation(text:string): string {
        return this.translate.locale(text) ;
    } 

    public getLastLlData(): CsLatLongData {
        return this.lastLlData;
    }
    
    public setLanguage(lang:string): void {
        this.translate.setDefault(lang) ;
    } 

    public abstract configure(): void;

    private initMap(): void {
        let mapSize = document.getElementById("map").getClientRects()
        if (mapSize[0].height == 0) {
            console.warn("Bug Safari slow render");
            let self = this
            setTimeout(() => { self.initMap() })
            return;
        } else {
            this.csMap.init();
        }
    }

    public async render(): Promise<BaseApp> {
        try {
            // 1. Configuración inicial
            await this.setupInitialConfiguration();
            
            // 2. Renderizado de la estructura base
            this.renderBaseStructure();
            
            // 3. Renderizado de componentes principales (que no dependen de datos)
            this.renderMainComponents();
            
            // 4. Inicialización del mapa y carga de datos
            this.initMap();
            if (computedDataTilesLayer) {
                await this.waitForDataLoad()
            }
            
            // 5. Renderizado de componentes que dependen de datos
            this.renderDataDependentComponents();
            
            // 6. Configuraciones finales
            this.finalizeSetup();
            
            return this;
        } catch (error) {
            console.error('Error in render method:', error);
            // Continuar con renderizado básico aunque haya errores
            this.renderFallback();
            return this;
        }
    }
    
    private async setupInitialConfiguration(): Promise<void> {
        // Configuración de zip.js
        zip.workerScriptsPath = "zip_js/";
        zip.configure({
            workerScripts: {
                deflate: [require('@zip.js/zip.js/lib/z-worker')],
                inflate: [require('@zip.js/zip.js/lib/z-worker')]
            }
        });
        
        // Configuración de idioma
        this.setLanguage(locale);
        
        // Inicialización de InfoDiv si es necesario
        if (this.infoDiv == null) {
            this.infoDiv = new InfoDiv(this, "infoDiv");
        }
    }
    
    private renderBaseStructure(): void {
        // Renderizado del frame principal
        mount(this.mainFrame.render(), document.body);
        this.mainFrame.build();
    }
    
    private renderMainComponents(): void {
        // Componentes que no dependen de datos
        const mainFrameElement = document.getElementById('MainFrame');
        if (!mainFrameElement) {
            throw new Error('MainFrame element not found');
        }
        
        // Menu Bar
        addChild(mainFrameElement, this.menuBar.render());
        this.menuBar.build();
        
        // Left Bar
        addChild(mainFrameElement, this.leftBar.render());
        this.leftBar.build();
        
        // Layer Frame
        const leftBarElement = document.getElementById('LeftBar');
        if (leftBarElement) {
            addChild(leftBarElement, this.layerFrame.render());
            this.layerFrame.build();
        }
        
        // Right Bar
        addChild(mainFrameElement, this.rightBar.render());
        this.rightBar.build();
        
        // Date Selector Frame
        addChild(mainFrameElement, this.dateSelectorFrame.render());
        this.dateSelectorFrame.build();
        
        // Graph
        addChild(mainFrameElement, this.graph.render());
        this.graph.build();
        
        // Info Div
        addChild(mainFrameElement, this.infoDiv.render());
        
        // Top Right Frame
        const infoElement = document.getElementById('info');
        if (infoElement) {
            const topRightFrame = document.createElement("div");
            topRightFrame.className = "TopRightFrame";
            addChild(infoElement, topRightFrame);
            
            this.infoDiv.build();
            addChild(topRightFrame, this.infoFrame.render());
            this.infoFrame.build();
            
            if (isKeyCloakEnabled) {
                addChild(topRightFrame, this.loginFrame.render());
                this.loginFrame.build();
            }
        }
        
        // Download Options
        addChild(mainFrameElement, this.downloadOptionsDiv.render());
        this.downloadOptionsDiv.build();
        
        // CS Map
        addChild(document.body, this.csMap.render());
        
        // Download Iframe
        addChild(mainFrameElement, DownloadIframe());
    }
    
    private renderDataDependentComponents(): void {
        // Componentes que necesitan datos cargados
        const rightBarElement = document.getElementById('RightBar');
        if (rightBarElement) {
            // Palette Frame
            addChild(rightBarElement, this.paletteFrame.render());
            this.paletteFrame.build();
            
            // Download Frame
            if (hasDownload) {
                addChild(rightBarElement, this.downloadFrame.render());
                this.downloadFrame.build();
                this.downloadFrame.update();
            }
        }
    }
    
    private finalizeSetup(): void {
        // Configuraciones finales
        if (hasCookies) {
            this.cookies.addCookies();
        }
    }
    
    private renderFallback(): void {
        // Renderizado mínimo en caso de error
        console.warn('Using fallback rendering');
        try {
            mount(this.mainFrame.render(), document.body);
            this.mainFrame.build();
        } catch (fallbackError) {
            console.error('Fallback rendering also failed:', fallbackError);
        }
    }
    
    private waitForDataLoad(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Si ya hay datos, resolver inmediatamente
            if (this.state.computedData && Object.keys(this.state.computedData).length > 1) {
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 100; // 10 segundos con intervalos de 100ms
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                // Verificar si los datos están disponibles
                if (this.state.computedData && Object.keys(this.state.computedData).length > 1) {
                    clearInterval(checkInterval);
                    console.log('Data loaded successfully');
                    resolve();
                    return;
                }
                
                // Timeout de seguridad
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('Timeout waiting for data to load, proceeding anyway');
                    resolve(); // Resolver aunque no haya datos para continuar
                }
            }, 100);
        });
    }

    onDragStart(event: CsMapEvent): void {
        if (avoidMinimize) return;
        this.menuBar.minimize();
        this.leftBar.minimize();
        this.downloadFrame.minimize();
        this.paletteFrame.minimize();
        this.dateSelectorFrame.minimize();
        this.infoFrame.minimize();

        if (isKeyCloakEnabled) this.loginFrame.minimize();
    }

    onMapInited(): void {
        //console.log("Div Map Inited")
    }

    onMapLoaded(): void {
        //console.log("Map loaded")
    }

    public onLlDataLoaded(data: CsLatLongData) {
        if (data.value == 0) return;
        this.lastLlData = data;
        this.csMap.showMarker(data.latlng);
        this.rightBar.enableLatLng(data.latlng)
    }

    public hidePointButtons(): void {
        this.downloadFrame.hidePointButtons()
    }

    public showPointButtons(): void {
        this.downloadFrame.showPointButtons()
    }

    onClick(event: CsMapEvent): void {
        //console.log("Map Clicked");

        this.menuBar.showLoading();
        loadLatLongData(event.latLong, this.state, this.timesJs)
            .then((data: CsLatLongData) => {
                this.menuBar.hideLoading();
                this.onLlDataLoaded(data)
            })
            .catch((reason: any) => {
                this.menuBar.hideLoading();
            });
    }

    protected getUrlForNC(suffix?: string): string {
        let currUrl = new URL(document.location.toString())
        currUrl.search = "";
        if (this.state.support == defaultRenderer) {
            currUrl.pathname += "nc/data/" + this.state.varId;
            if (suffix != undefined) currUrl.pathname += suffix != "none" ? "_" + suffix : "";
            currUrl.pathname += ".nc";
        } else {
            currUrl.pathname += "data/" + this.getFolders(this.state.support) + "/" + this.state.varId +  ".csv";
        }
        
        return currUrl.toString();
    }

    public downloadNc(suffix?: string): void {
        window.open(this.getUrlForNC(suffix), '_blank');
    }

    public downloadPoint(): void {
        let ncCoords: number[] = fromLonLat([this.lastLlData.latlng.lng, this.lastLlData.latlng.lat], this.timesJs.projection);
        let portion: string = getPortionForPoint(ncCoords, this.timesJs, this.state.varId);
        // downloadTCSVChunked(this.lastLlData.value, this.state.varId, portion, browserDownloadFile);
        if (computedDataTilesLayer) this.computeTimeData(this.lastLlData.value, portion, [],browserDownloadFile);
        else downloadTCSVChunked(this.lastLlData.value, this.state.varId, portion, browserDownloadFile);
    }

    public downloadFeature(featureProps:  any = []):void {
        let filename = featureProps['id'] + '-' + featureProps['name'] +'.csv';
        browserDownloadFile(this.state.timeSeriesData, filename, 'text/plain');
    } 

    public downloadPointOptions(): void {
        this.downloadOptionsDiv.openModal();
    }
    
    // ------- UNIFICAR 
    public showGraph() { 
        let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
            this.graph.showGraph(data, this.lastLlData.latlng)
        }
        let ncCoords: number[] = fromLonLat([this.lastLlData.latlng.lng, this.lastLlData.latlng.lat], this.timesJs.projection);
        let portion: string = getPortionForPoint(ncCoords, this.timesJs, this.state.varId);
        if (computedDataTilesLayer) this.computeTimeData(this.lastLlData.value, portion, [], open);
        else downloadTCSVChunked(this.lastLlData.value, this.state.varId, portion, open, true);
    }

    public showGraphBySt(stParams: any) {
        let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
            this.graph.showGraph(data, { lat: 0.0, lng: 0.0 }, stParams)
        }
        downloadCSVbySt(stParams['id'], this.state.varId, open);
    }

    public showGraphByRegion(folder: string, stParams: any) {
        let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
            this.state.timeSeriesData = data
            this.graph.showGraph(data, { lat: 0.0, lng: 0.0 }, stParams)
        }
        if (computedDataTilesLayer) this.computeTimeData(-1, '_all', stParams, open);
        else downloadTimebyRegion(folder, stParams['id'], this.state.varId, open);
    }
    // ------- UNIFICAR

    public getState(): CsViewerData {
        return this.state
    }

    protected setTimesJs(_timesJs: CsTimesJsData, varId: string) {
        this.timesJs = _timesJs;
        //TODO on change
        let timeIndex = typeof _timesJs.times[varId] === 'string'? 0:_timesJs.times[varId].length - 1
        let legendTitle: string;
        if (_timesJs.legendTitle[varId] != undefined) {
            legendTitle = _timesJs.legendTitle[varId]
        } else {
            legendTitle = LEYEND_TITLE
        }
        let varName: string
        if (_timesJs.varTitle[varId] != undefined) {
            varName = _timesJs.varTitle[varId]
        } else {
            varName = varId
        }
        
        let uncertainty = _timesJs.times[varId  + UNCERTAINTY_LAYER] != undefined 
        
        if (this.state == undefined) this.state = INITIAL_STATE;
        this.state = {
            ...this.state,
            varId: varId,
            varName: varName,
            times: _timesJs.times[varId],
            selectedTimeIndex: timeIndex,
            legendTitle: legendTitle,
            selection: "",
            selectionParam: 0,
            selectionParamEnable: false,
            uncertaintyLayer: uncertainty
        }
    }

    public getTimesJs(): CsTimesJsData {
        return this.timesJs
    }

    public changeUrl(): void {
        let newUrl = new URL(document.location.toString())
        newUrl.searchParams.set("var", this.state.varId)
        newUrl.searchParams.set("ti", this.state.selectedTimeIndex.toString())
        newUrl.searchParams.set("sp", this.state.support)
        newUrl.searchParams.set("tp", this.state.tpSupport)

        if (history.replaceState) {
            history.replaceState({}, "", newUrl)
        } else {
            history.pushState({}, "", newUrl)
        }
    }

    public fillStateFromUrl(): boolean {
        let ret = false
        let newUrl = new URL(document.location.toString())
        if (newUrl.searchParams.has("var")) {
            ret = true
            this.state.varId = newUrl.searchParams.get("var")
        }
        if (newUrl.searchParams.has("ti")) {
            ret = true
            this.state.selectedTimeIndex = parseInt(newUrl.searchParams.get("ti"))
        }
        if (newUrl.searchParams.has("sp")) {
            ret = true
            this.state.support = newUrl.searchParams.get("sp")
        }
        if (newUrl.searchParams.has("tp")) {
            ret = true
            this.state.tpSupport = newUrl.searchParams.get("tp")
        }
        return ret
    }

    public async update(dateChanged: boolean = false):Promise<void> {
        this.menuBar.update();
        this.leftBar.update();
        this.csMap.updateDate(this.state.selectedTimeIndex, this.state)
        this.csMap.updateRender(this.state.support)
        if (computedDataTilesLayer) {
            await this.waitForDataLoad()
        }
        if (!dateChanged) this.dateSelectorFrame.update();
        this.paletteFrame.update();
        this.changeUrl();
    }

    public getInfoDiv(): InfoDiv {
        return this.infoDiv
    }

    public spatialSelected(index: number, value?: string, values?: string[]): void {
        this.state.support = value;
        this.update();
    }

    public temporalSelected(index: number, value?: string, values?: string[]): void {
        this.state.tpSupport = value;
        this.update();
    }

    public setPalette(palette: string) {
        PaletteManager.getInstance().setSelected(palette);
        this.paletteFrame.update()
    }

    //Methods Handling the Menus
    public abstract varSelected(index: number, value?: string, values?: string[]): void;
    //by default do nothing, only apps that have subVars
    public subVarSelected(index: number, value?: string, values?: string[]): void {

    }
    public abstract selectionSelected(index: number, value?: string, values?: string[]): void;

    public seasonSelected(index: number, value?: string, values?: string[]): void {
        this.state.season = value;
        this.update( true );
    }
    public monthSelected(index: number, value?: string, values?: string[]): void {

    }

    // Generic dropdown handling
    public abstract dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;
    
    public abstract selectionParamChanged(param: number): void;
    public abstract getLegendValues(): number[];

    public getLegendText() {
        let ret: string[]
        let vals = this.getLegendValues();
        if (vals == undefined) return undefined;
        ret = [];
        vals.forEach((value) => { ret.push(value.toFixed(2) + "") })
        return ret
    }

    public async filterValues(values: number[], t: number, varName: string, portion: string): Promise<number[]> {
        if (this.state.selection==STR_ALL)return values;
        for (let i = 0; i < values.length; i++) {
            if (values[i] < this.state.selectionParam) {
                values[i] = NaN;
            }
        }
        return values;
    }

    public notifyMaxMinChanged(): void {
        if (this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex] == this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex] ||
            isNaN(this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex]) ||
            isNaN(this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex]) ||
            !isFinite(this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex]) ||
            !isFinite(this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex])) {
            this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex] = maxWhenInf;
            this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex] = minWhenInf;
        }
        // this.paletteFrame.update();
        // if (this.stationsLayer != undefined) {
        //     this.stationsLayer.refresh()
        // }
        this.csMap.refreshFeatureLayer()
    }

    public dateDateBack(): void {
        if (this.state.selectedTimeIndex == 0) return;
        this.state.selectedTimeIndex--;
        this.update()
    }
    public dateDateForward(): void {
        if (this.state.selectedTimeIndex == this.state.times.length - 1) return;
        this.state.selectedTimeIndex++;
        this.update()
    }

    private daysDiff(srcDateIndex: number, dstDateIndex: number) {
        let dateSrc = new Date(this.state.times[srcDateIndex])
        let dateDst = new Date(this.state.times[dstDateIndex])
        let src = Date.UTC(dateSrc.getFullYear(), dateSrc.getMonth(), dateSrc.getDate())
        let dst = Date.UTC(dateDst.getFullYear(), dateDst.getMonth(), dateDst.getDate())
        let diff = (dst - src)
        let oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    public dateEventBack(): void {
        if (this.state.selectedTimeIndex == 0) return;
        let p = this.state.selectedTimeIndex - 1;
        let diff = this.daysDiff(p + 1, p)
        while (diff == -1) {
            p--;
            if (p == 0) return;
            diff = this.daysDiff(p + 1, p);
        }
        this.state.selectedTimeIndex = p;
        this.update()
    }

    public dateEventForward(): void {
        if (this.state.selectedTimeIndex == this.state.times.length - 1) return;
        let p = this.state.selectedTimeIndex + 1;
        let diff = this.daysDiff(p - 1, p)
        while (diff == 1) {
            p++;
            if (p == this.state.times.length - 1) return;
            diff = this.daysDiff(p - 1, p);
        }
        this.state.selectedTimeIndex = p;
        this.update()
    }

    protected daysIntoYear(dateIndex: number): number {
        let date = new Date(this.state.times[dateIndex])
        let now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        let start = Date.UTC(date.getFullYear(), 0, 0)
        let diff = (now - start)
        let oneDay = 1000 * 60 * 60 * 24;
        let day = Math.floor(diff / oneDay);
        return day - 1;
    }

    protected getQxxIndex(dateIndex: number): number {
        let date = new Date(this.state.times[dateIndex])
        return date.getMonth();
    }

    public showClimatology(){
        // this.leftBar.showClimFrame(); // -VERSIÓN SIDEBAR_00  (DROPDOWNS)
        this.menuBar.showClimFrame();
        // this.dateSelectorFrame.showClimFrame();
    }

    public hideClimatology(){
        // this.leftBar.hideClimFrame();  // -VERSIÓN SIDEBAR_00  (DROPDOWNS)
        this.menuBar.hideClimFrame();
        // this.dateSelectorFrame.hideClimFrame();
    }

    //Methods to modify the data at will (Change units, filter fillValues,...)

    // Be called after cache, before buildImages
    public transformDataXY(floatArray: number[], t: number, varName: string, portion: string) {
        //Do nothing
    }
    // Be called after Download
    public transformDataT(floatArray: number[], t: number, varName: string, portion: string) {
        //Do nothing
    }

    // Customizable graph in each viewer
    public completeGraph(graph: Dygraph, data: any) {
        //Do nothing
    }

    // Customizable data layer in each viewer    
    public computeLayerData(t: number, varName: string, portion: string): any  {
        //Do nothing
    }

    // Customizable graph data in each viewer
    public computeTimeData(x: number, portion: string, station: any = [], doneCb: CsvDownloadDone): void {
        //Do nothing
    }

    public computeFeatureLayerData(time: string, folder: string, varName: string, doneCb: CsvDownloadDone) {
        //Do nothing
    }

    public getFeatureStyle(feature: FeatureLike): Style {
        return DEF_STYLE_STATIONS;
    }

    // public formatPopupValue(text: string, value: number): string {
    //     return this.getTranslation('valor_en') + text + value.toFixed(2)
    // }

    public formatPopupValue(text: string, value: number): string {
        let formattedValue: string;
        if (value % 1 === 0) {
            formattedValue = value.toString(); // Convierte el número directamente a string sin decimales
        } else {
            formattedValue = value.toFixed(2); // Mantiene 2 decimales para estos casos
        }
    
        return this.getTranslation('valor_en') + text + formattedValue;
    }

    // Metohds to manage renderers & folders
    public setRenderers(rd:number[] = [], remove: boolean = false): string[] {
        if (rd.length > 0 ) this.enableRenderer(rd);
        // else {
            for (let i = 0; i < renderers.length; i++ ){
                if(renderers[i].startsWith("~")){
                    if (remove) {this.removeRenderer(i)} else { this.disableRenderer(i)}
                }
            }
        // }
        return renderers;
    }
    
    public getRenderers(): string[] {
        return renderers;
    }

    public getDefaultRenderer(): string {
        return defaultRenderer;
    }

    public enableRenderer(rd:number[]){
        rd.forEach( i => {
            if(renderers[i].startsWith("~")){
                renderers[i]=renderers[i].substring(1)
            }
        } )
    }

    public disableRenderer(i:number){
        if(! renderers[i].startsWith("~")){
            renderers[i]="~"+renderers[i];
        }
    }

    public removeRenderer(i:number){
        if(! renderers[i].startsWith("-")){
            renderers[i]=renderers[i].substring(1)
        }
        renderers[i]="-"+renderers[i];
    }

    public getFolders(rendererName: string): string[] {
        const rendererIndex = renderers.indexOf(rendererName);
        if (rendererIndex === -1) {
            return []; // Renderer name not found
        }

        const folderIds: string[] = [];
        for (let i = 0; i < folders.renderer.length; i++) {
            if (folders.renderer[i] === rendererIndex) { 
                folderIds.push(folders.folder[i]);
            }
        }
        return folderIds;
    }
}
