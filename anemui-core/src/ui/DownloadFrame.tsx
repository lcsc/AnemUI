import { createElement, addChild } from 'tsx-create-element';
import { CsLatLong } from '../CsMapTypes';
import { BaseApp } from '../BaseApp';
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
    protected btnPoint: HTMLButtonElement;
    protected parent: BaseApp;
    protected dropPointContainter: HTMLDivElement;
    protected pointButtonsContainer: HTMLElement[];
    protected dropPoint: Dropdown;
    protected dropNc: Dropdown
    protected dropNcDownButton: HTMLButtonElement
    protected downloadNcOptions: DownloadNcOption[] = [{ value: "descargar_peninsula", suffix: "pen" }, { value: "descargar_canarias", suffix: "can" }];

    public render(): JSX.Element {
        let oneOption = this.downloadNcOptions.length == 1? true:false;
        let self = this;
        let element =
            (<div id="DownloadFrame" className='rightbar-item downloadFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div className='downlad-buttons'>
                    <div className='btnSelect right d-grid mx-auto'>
                        { !oneOption &&
                            <div id="dropNc" role="dropNc">
                                <div className="buttonDiv dataDiv visible" onClick={()=>this.toggleSelect('dataDiv')}>
                                    <span className="icon"><i className="bi bi-box-arrow-down"></i></span>
                                    <span className="text" aria-label='top'>
                                        {this.parent.getTranslation('descargar_nc')}
                                    </span>
                                </div>
                                <div className='row selectDiv dataDiv hidden'>
                                    <div className='col closeDiv p-0' onClick={()=>this.toggleSelect('dataDiv')}>
                                        <span className="icon"><i className="bi bi-x"></i></span>
                                    </div>
                                    <div className='col-9 p-0 inputDiv'>
                                        <select className="form-select form-select-sm" aria-label="Change Base" onChange={(event)=>self.parent.downloadNc(event.target.value)}>
                                            {
                                            this.downloadNcOptions.map((value) => {
                                                    let option = value.value;
                                                    return (
                                                        <option value={value.suffix}>{this.parent.getTranslation(option)}</option>
                                                    )
                                                })
                                            }
                                        </select>
                                    </div>
                                </div>
                            </div>
                        }
                        { oneOption && 
                            <fieldset id="btnNc" role="dropNc" className='navbar-btn buttonDiv visible'>
                                <span className="icon"><i className="bi bi-box-arrow-down"></i></span>
                                <span className="text" aria-label='base' onClick={() => { this.parent.downloadNc() }}>
                                    {this.parent.getTranslation('descargar_nc')}
                                </span>
                            </fieldset>
                        }
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
        
        this.containerHandler.hidden = true;

        this.dropPointContainter = this.container.querySelector("[role=dropPoint]")
        if (this.downloadNcOptions.length > 1) {
            let ncContainer = this.container.querySelector("[role=dropNc]")
            this.dropNc = new Dropdown(ncContainer);
            this.dropNcDownButton = ncContainer.getElementsByTagName("button")[1]
        }
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
    public toggleSelect(select: string){
        this.container.querySelector(".buttonDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".selectDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".buttonDiv." + select).classList.toggle("visible")
        this.container.querySelector(".selectDiv." + select).classList.toggle("visible")
    }

    public disableDwButtons(): void {
        let dropItems = this.container.getElementsByClassName("dropdown-item")
        for (let i = 0; i < dropItems.length; i++) {
            let dropItem:  HTMLLinkElement = dropItems[i] as HTMLLinkElement;
            dropItem.disabled = true; 
        }
    }
    
    public  hidePointButtons(): void {
        this.pointButtonsContainer.forEach((btn) =>{
            btn.hidden = true;
        })
    }
    public showPointButtons(): void {
        this.pointButtonsContainer.forEach((btn) =>{
            btn.hidden = false;
        })
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