import { createElement, addChild } from 'tsx-create-element';
import { CsLatLong } from '../CsMapTypes';
import { BaseApp } from '../BaseApp';
import { CsLatLongData } from '../data/CsDataTypes';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { Dropdown } from 'bootstrap';
import { modal } from 'tingle.js';
import { disableDownload }  from "../Env";

export const DownloadIframe = () => {
    return (<iframe id="download_iframe"></iframe>);
}

export type DownloadNcOption = {
    value: string,
    suffix?: string
}

export class DownloadFrame extends BaseFrame {

    protected containerButons: HTMLElement;
    protected containerHandler: HTMLElement;
    protected containerLatLong: HTMLDivElement
    protected btnGraph: HTMLButtonElement;
    protected btnDrpPoint: HTMLButtonElement;
    protected parent: BaseApp;
    protected dropPointContainter: HTMLDivElement;
    protected pointButtonsContainer: HTMLDivElement;
    protected dropPoint: Dropdown;
    protected dropNc: Dropdown
    protected dropNcDownButton: HTMLButtonElement
    protected pointCoords: CsLatLong;
    protected downloadNcOptions: DownloadNcOption[] = [{ value: "descargar_peninsula", suffix: "pen" }, { value: "descargar_canarias", suffix: "can" }];

    public render(): JSX.Element {

        // let language = this.parent.getLanguage();

        let self = this;
        let element =
            (<div id="DownloadFrame" className='downloadFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div className='downlad-buttons'>
                    <div id="latlong" role="latLong" style={{ visibility: "hidden" }}><i className="bi bi-pin-map"></i> <span>latLng</span></div>
                    <div className='d-grid mx-auto gap-2'>
                        <div id="dropNc" className="btn-group dropend droppDownButton" role="dropNc">
                            <button type="button" role="nc" className="btn btn-md navbar-btn navbar-btn-title" onClick={() => { this.displayNcDownloads() }}>{this.parent.getTranslation('descargar_nc')}</button>
                            <button type="button" className="btn btn-md navbar-btn navbar-btn-split dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                <span className="visually-hidden"></span>
                            </button>
                            <ul className="dropdown-menu">
                                {
                                    this.downloadNcOptions.map((value) => {
                                        let option = value.value;
                                        return (
                                            <li><a className="dropdown-item" onClick={() => { this.parent.downloadNc(value.suffix) }}>{this.parent.getTranslation(option)}</a></li>
                                        )
                                    })
                                }
                            </ul>
                        </div>
                        <div id="point-buttons">
                            {/* <div id="dropPoint" className="btn-group dropend droppDownButton" role="dropPoint">
                                <button type="button" className="btn btn-md navbar-btn navbar-btn-title" disabled onClick={() => { this.parent.downloadPoint() }}>{this.parent.getTranslation('descargar_pixel')}</button>
                                <button type="button" className="btn btn-md navbar-btn navbar-btn-split dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false" disabled>
                                    <span className="visually-hidden"></span>
                                </button>
                                <ul className="dropdown-menu">
                                    <li><a className="dropdown-item" onClick={() => { this.parent.downloadPoint() }}>{this.parent.getTranslation('descargar_pixel')}</a></li>
                                    <li><a className="dropdown-item" onClick={() => { this.parent.downloadPointOptions() }}>{this.parent.getTranslation('opciones_avanzadas')}</a></li>
                                </ul>
                            </div> */}
                            <div id="dropBtn" className="droppDownButton">
                                <button type="button" role="dropPointBtn" className="btn navbar-btn" disabled  onClick={() => { this.parent.downloadPoint() }}>{this.parent.getTranslation('descargar_pixel')}</button>
                            </div>
                            <div id="graphDiv" className="droppDownButton">
                                <button type="button" role="graph" className="btn navbar-btn" style={this.parent.getGraph().byPoint ? { visibility: "visible" } : { visibility: "hidden" }} disabled onClick={() => { this.parent.showGraph() }}>{this.parent.getTranslation('grafico_pixel')}</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='download-handler'>
                    <i className="bi bi-menu-button-wide-fill"></i>
                </div>

            </div>);
        return element;
    }

    private displayNcDownloads() {
        if (this.downloadNcOptions == undefined || this.downloadNcOptions.length == 0) return
        if (this.downloadNcOptions.length == 1) {
            this.parent.downloadNc(this.downloadNcOptions[0].suffix)
        } else {
            setTimeout(() => { this.dropNcDownButton.click() });
        }
    }

    public setDownloadNcOptions(options: DownloadNcOption[]) {
        this.downloadNcOptions = options;
    }

    public build() {
        this.container = document.getElementById("DownloadFrame") as HTMLDivElement
        this.containerButons = this.container.getElementsByClassName("downlad-buttons")[0] as HTMLElement
        this.containerHandler = this.container.getElementsByClassName("download-handler")[0] as HTMLElement
        this.pointButtonsContainer = this.container.querySelector("[id=point-buttons]") as HTMLDivElement

        this.containerHandler.hidden = true;

        this.btnGraph = this.container.querySelector("[role=graph]");
        this.btnDrpPoint = this.container.querySelector("[role=dropPointBtn]");
        this.containerLatLong = this.container.querySelector("[role=latLong]") as HTMLDivElement
        this.dropPointContainter = this.container.querySelector("[role=dropPoint]")
        // this.dropPoint = new Dropdown(this.dropPointContainter)
        let ncContainer = this.container.querySelector("[role=dropNc]")
        this.dropNc = new Dropdown(ncContainer);
        this.dropNcDownButton = ncContainer.getElementsByTagName("button")[1]
        if (disableDownload) {
            this.disableDwButtons();
        }
    }

    public minimize(): void {
        this.containerButons.hidden = true;
        this.containerHandler.hidden = false;
    }
   
    public showFrame(): void {
        if (!this.containerButons.hidden) return;
        this.containerButons.hidden = false;
        this.containerHandler.hidden = true;
        this.parent.getSideBar().showFrame();
    }
    public enableDataButtons(latlng: CsLatLong): void {
        this.pointCoords = latlng
        this.btnGraph.disabled = false
        this.btnDrpPoint.disabled = false
        let btns = this.dropPointContainter.getElementsByTagName("button")
        for (let i = 0; i < btns.length; i++) {
            let btn: HTMLButtonElement = btns[i] as HTMLButtonElement;
            btn.disabled = false;
        }
        this.containerLatLong.style.visibility = "visible";
        this.containerLatLong.getElementsByTagName("span")[0].textContent = "Lat:" + latlng.lat.toFixed(2) + " Long:" + latlng.lng.toFixed(2)
    }

    public disableDwButtons(): void {
        let dropItems = this.container.getElementsByClassName("dropdown-item")
        for (let i = 0; i < dropItems.length; i++) {
            let dropItem:  HTMLLinkElement = dropItems[i] as HTMLLinkElement;
            dropItem.disabled = true; 
        }
    }
    public hidePointButtons(): void {
        this.pointButtonsContainer.hidden = true;
    }
    public showPointButtons(): void {
        this.pointButtonsContainer.hidden = false;
    }
}


export class DownloadOptionsDiv extends BaseFrame {
    protected container: HTMLDivElement;
    protected id: string
    protected modal: modal;

    constructor(_parent: BaseApp, _id: string) {
        super(_parent)
        this.id = _id;
    }
    public build(): void {
        this.container = document.getElementById(this.id) as HTMLDivElement
        this.modal = new modal({
            footer: true,
            stickyFooter: false,
            closeMethods: ['overlay', 'button', 'escape'],
            closeLabel: "Cerrar",
            //cssClass: ['custom-class-1', 'custom-class-2'],
            onOpen: function () {
                //console.log('modal open');
            },
            onClose: function () {
                //console.log('modal closed');
            },
            beforeClose: function () {
                // here's goes some logic
                // e.g. save content before closing the modal
                return true; // close the modal
            }
        });

        this.modal.setContent(this.getDiv());
        let self = this
        this.modal.addFooterBtn('Cerrar', 'tingle-btn tingle-btn--danger tingle-btn--pull-right', function () {
            self.modal.close();
        });
    }
    public minimize(): void {
        throw new Error("Method not implemented.");
    }
    public showFrame(): void {
        throw new Error("Method not implemented.");
    }
    public render(): JSX.Element {
        return (<div id={this.id}>
            <div className="modal-header">
                <h1>Opciones Avanzadas de Descarga</h1>
            </div>
            <div className="modal-content">
                <strong>No implementado aún</strong>
                <p>Espacio reservado para futuras opciones como selector de rango, formato de salida...</p>
            </div>
        </div>);
    }

    public openModal(): void {
        this.modal.open();
    }

    public getDiv(): HTMLDivElement {
        return this.container;
    }
}