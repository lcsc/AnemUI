import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { logo } from '../Env';

export interface MenuBarListener {
    spatialSelected(index: number, value?: string, values?: string[]): void;
    temporalSelected(index: number, value?: string, values?: string[]): void;
    varSelected(index: number, value?: string, values?: string[]): void;
    subVarSelected(index: number, value?: string, values?: string[]): void;
    selectionSelected(index: number, value?: string, values?: string[]): void;
    selectionParamChanged(param: number): void;
}

export class MenuBar extends BaseFrame {

    private title: string

    private menuInfo1: HTMLElement
    private menuInfo2: HTMLElement

    private topBar: HTMLElement
    private menuCentral: HTMLElement
    private loading: HTMLDivElement

    private displaySpSupport: HTMLDivElement
    private displayTpSupport: HTMLDivElement
    private displayVar: HTMLDivElement
    private displaySubVar: HTMLDivElement
    private displaySelection: HTMLDivElement
    private displayParam: HTMLInputElement

    private selectionHidden: boolean;
    private paramHidden: boolean;

    private listener: MenuBarListener;

    private extraBtns: BaseUiElement[];

    constructor(_parent: BaseApp, _listener: MenuBarListener) {
        super(_parent)
        let self = this
        this.listener = _listener;

        this.extraBtns = []

    }


    public setTitle(_title: string) {
        this.title = _title;
        document.title = _title;
    }

    private fireParamChanged(): void {
        this.listener.selectionParamChanged(parseFloat(this.displayParam.value));
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (<div id="MainBarFrame">
                <div id="TopBar" className="row" onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                    <div id="logo" className="col mt-1 text-left pt-1 pl-1 float-start">
                        <img src={'./images/'+logo}></img>
                    </div>
                    <div id="central" className="col-8 float-start">
                        <div id="menu-title" className="menu-info text-center">
                            <h3 id="title">{this.title}</h3>
                        </div>
                        <div id="menu-central" className="col-12 text-center">
                            {/* <form id="search">
                                <label >
                                    <input name="q" id="search-q" className="p" value="Search location...">z/</input>
                                </label>
                                {/* <ul className="d"><li className="progress">No results found.</li></ul> */}
                            {/* <a className="r" title="Find my location"></a>
                            </form> */}
                            <div id="SubBar" className="row d-flex">
                                {/* <div className="col-10 mt-1"> */}
                                <form className="gy-1 gx-1 align-items-center" onSubmit={() => { this.fireParamChanged(); return false }}>
                                    <div id="inputs" className="input-group input-group-sm">
                                        <div role="spSupport" className="input-group-text">{this.parent.getState().support}</div>
                                        <div role="var" className="input-group-text">{this.parent.getState().varName}</div>
                                        <div role="subVar" className="input-group-text" hidden={true}>{this.parent.getState().subVarName}</div>
                                        <div role="tpSupport" className="input-group-text" hidden={true}>{this.parent.getState().tpSupport}</div>
                                        <div role="selection" className="input-group-text">{this.parent.getState().selection}</div>
                                        <input role="selection-param" type="text" className="form-control form-control-sm autoSizingInputGroup"
                                            placeholder="Selection Param" value={this.parent.getState().selectionParam}
                                            disabled={!this.parent.getState().selectionParamEnable}
                                            onChange={() => { this.fireParamChanged(); return false }} />
                                        <div className="col-auto">
                                            <div className="spinner-grow text-info" role="status" hidden />
                                        </div>
                                    </div>
                                </form>
                                {/* </div> */}
                            </div>
                        </div>
                    </div>
                    <div className="col menu-info" id="info">

                    </div>
                </div>
            </div>
            );
        return element;
    }

    public build() {
        this.container = document.getElementById("MainBarFrame") as HTMLDivElement;
        
        
        this.topBar = document.getElementById('TopBar') as HTMLElement;
        this.menuCentral = document.getElementById('menu-central') as HTMLElement;
        this.menuInfo1 = this.container.getElementsByClassName("menu-info")[0] as HTMLElement;
        this.menuInfo2 = this.container.getElementsByClassName("menu-info")[1] as HTMLElement;
        this.loading = this.container.querySelector("[role=status]") as HTMLDivElement;



        let height = this.loading.parentElement.getBoundingClientRect().height;
        height = height - 6;

        this.loading.style.height = height + "px";
        this.loading.style.width = height + "px";


        this.displaySpSupport = this.container.querySelector("[role=spSupport]")
        this.displayTpSupport = this.container.querySelector("[role=tpSupport]")
        this.displayVar = this.container.querySelector("[role=var]")
        this.displaySelection = this.container.querySelector("[role=selection]")
        this.displayParam = this.container.querySelector("[role=selection-param]")
        if (this.parent.hasSubVars()) {
            this.displaySubVar = this.container.querySelector("[role=subVar]")
            this.displaySubVar.hidden = false;
        }
        if (this.parent.hasTpSupport()) {
            this.displayTpSupport = this.container.querySelector("[role=tpSupport]")
            this.displayTpSupport.hidden = false;
        }

        if (this.selectionHidden) {
            this.displaySelection.hidden = true;
            document.getElementById("inputs").classList.add('no-wrap');
            if (this.parent.hasTpSupport()) {
                this.displayTpSupport.classList.add('Input-group-end');
            } else if (this.parent.hasSubVars()) {
                this.displaySubVar.classList.add('Input-group-end');
            } else {
                this.displayVar.classList.add('Input-group-end');
            }

        }
        if (this.paramHidden) {
            this.displayParam.hidden = true;
            document.getElementById("inputs").classList.add('no-wrap');
            this.displaySelection.classList.add('Input-group-end');
        }
    }

    public minimize(): void {
        this.menuInfo1.hidden = true;
        this.menuInfo2.hidden = true;
        this.menuCentral.classList.remove('col-md');
        this.topBar.classList.add('smallBar');
    }
    public showFrame(): void {
        this.menuInfo1.hidden = false;
        this.menuInfo2.hidden = false;
        
        this.menuCentral.classList.add('col-md');
        this.topBar.classList.remove('smallBar');
    }

    public showLoading(): void {
        this.loading.hidden = false;

    }
    public hideLoading(): void {
        this.loading.hidden = true;
    }

    public hideSelection() {
        this.selectionHidden = true;

    }

    public hideParam() {
        this.paramHidden = true;
    }

    public update(): void {
        this.displaySpSupport.textContent = this.parent.getState().support;
        if (this.parent.hasTpSupport()) {
            this.displayTpSupport.textContent = this.parent.getState().tpSupport;
        }
        this.displayVar.textContent = this.parent.getState().varName;
        this.displaySelection.textContent = this.parent.getState().selection;
        this.displayParam.value = this.parent.getState().selectionParam + "";
        this.displayParam.disabled = !this.parent.getState().selectionParamEnable;
        if (this.parent.hasSubVars()) {
            this.displaySubVar.textContent = this.parent.getState().subVarName;
        }
    }

    //Llamar en el configure antes del build
    public addButton(btn: BaseUiElement): void {
        this.extraBtns.push(btn)
    }
}
