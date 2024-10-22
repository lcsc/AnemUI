import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { logo, logoStyle, hasSpSupport, hasSubTitle, hasSubVars, hasTpSupport, hasClimatology, hasVars}  from "../Env";

export interface MenuBarListener {
    spatialSelected(index: number, value?: string, values?: string[]): void;
    temporalSelected(index: number, value?: string, values?: string[]): void;
    varSelected(index: number, value?: string, values?: string[]): void;
    subVarSelected(index: number, value?: string, values?: string[]): void;
    selectionSelected(index: number, value?: string, values?: string[]): void;
    dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;
    selectionParamChanged(param: number): void;
}

export class simpleDiv extends BaseUiElement {
    // protected container: HTMLDivElement;
    public id: string
    public title: string

    constructor( _id: string,  _title: string) {
       super();
        this.id = _id;
        this.title = _title;
    }
    public build(): void {
        // this.container = document.getElementById(this.containerId) as HTMLDivElement
    }
    public minimize(): void {
        throw new Error("Method not implemented.");
    }
    public showFrame(): void {
        throw new Error("Method not implemented.");
    }
    
    public render(): JSX.Element {
        return (<div id={this.id} className="input-group-text">{this.title}</div>);
    }

    /* public getDiv(): HTMLDivElement {
        return this.container;
    } */
}

export class MenuBar extends BaseFrame {

    private title: string

    private menuopRight1: HTMLElement
    private menuInfo1: HTMLElement
    private menuInfo2: HTMLElement

    private topBar: HTMLElement
    private menuCentral: HTMLElement
    private loading: HTMLDivElement
    private titleDiv: HTMLElement

    private displaySpSupport: HTMLDivElement
    private displayTpSupport: HTMLDivElement
    private displayVar: HTMLDivElement
    private displaySubVar: HTMLDivElement
    private displaySelection: HTMLDivElement
    private displayParam: HTMLInputElement
    
    private climatologyDisplay: HTMLDivElement
    private extraDisplays: simpleDiv[];
    private inputOrder: string[]

    private selectionHidden: boolean;
    private paramHidden: boolean;

    private listener: MenuBarListener;

    private extraBtns: BaseUiElement[];

    constructor(_parent: BaseApp, _listener: MenuBarListener) {
        super(_parent)
        let self = this
        this.listener = _listener;

        this.extraDisplays = []
        this.extraBtns = []
        this.inputOrder = []
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
            (
                <div id="TopBarFrame">
                    <div id="TopBar" className="row fixed-top" onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                        <div className={"navbar " + logoStyle}>
                            {/* <img src="./images/logos.png"></img> */}
                            <img src={'./images/'+logo}></img>
                        </div>
                        <div id="menu-title" className="menu-info text-left row mx-0 px-4">
                            <div className={"col " + logoStyle}>
                            {/* <div class="col" style="padding-left: 200px;"> */}
                                <h3 id="title">{this.title}</h3>
                            </div>
                            <div id="menu-central" className="col text-center">
                                <div id="SubBar" className="d-flex">
                                    <form className="gy-1 gx-1 align-items-center" onSubmit={() => { this.fireParamChanged(); return false }}>
                                        <div id="inputs" className="input-group input-group-sm">
                                            { hasSpSupport && <div id="input1" role="spSupport" className="input-group-text inputDiv">{this.parent.getState().support}</div> }
                                            { hasVars && <div id="input2" role="var" className="input-group-text inputDiv">{this.parent.getState().varName}</div> }
                                            { hasSubVars && <div id="input3" role="subVar" className="input-group-text inputDiv" hidden={true}>{this.parent.getState().subVarName}</div> }
                                            { hasTpSupport && <div id="input4" role="tpSupport" className="input-group-text inputDiv" hidden={true}>{this.parent.getState().tpSupport}</div> }
                                            <div id="input5" role="selection" className="input-group-text inputDiv">{this.parent.getState().selection}</div>
                                            <div id="climatologyDisplay" className='row'></div> 
                                            <input role="selection-param" type="text" className="form-control form-control-sm autoSizingInputGroup"
                                                placeholder="Selection Param" value={this.parent.getState().selectionParam}
                                                disabled={!this.parent.getState().selectionParamEnable}
                                                onChange={() => { this.fireParamChanged(); return false }} />
                                            <div className="col-auto">
                                                <div className="spinner-grow text-info" role="status" hidden />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <div className="col-1 menu-info d-flex flex-row-reverse" id="info">

                            </div>
                        </div>
                    </div>
                </div>
            );
        return element;
    }

    public build() {
        this.container = document.getElementById("TopBarFrame") as HTMLDivElement;
        this.topBar = document.getElementById('TopBar') as HTMLElement;
        this.menuCentral = document.getElementById('menu-central') as HTMLElement;
        this.titleDiv = document.getElementById('title') as HTMLElement;
        this.menuInfo1 = this.container.getElementsByClassName("menu-info")[0] as HTMLElement;
        // this.menuInfo2 = this.container.getElementsByClassName("menu-info")[1] as HTMLElement;
        this.loading = this.container.querySelector("[role=status]") as HTMLDivElement;
        this.climatologyDisplay = document.getElementById('climatologyDisplay') as HTMLDivElement;

        let height = this.loading.parentElement.getBoundingClientRect().height;
        height = height - 6;

        this.loading.style.height = height + "px";
        this.loading.style.width = height + "px";

        if (hasSpSupport) {
            this.displaySpSupport = this.container.querySelector("[role=spSupport]")
        }
        this.displayVar = this.container.querySelector("[role=var]")
        this.displaySelection = this.container.querySelector("[role=selection]")
        this.displayParam = this.container.querySelector("[role=selection-param]")
        if (hasSubVars) {
            this.displaySubVar = this.container.querySelector("[role=subVar]")
            this.displaySubVar.hidden = false;
        }
        if (hasTpSupport) {
            this.displayTpSupport = this.container.querySelector("[role=tpSupport]")
            this.displayTpSupport.hidden = false;
        }
        if (this.selectionHidden) {
            this.displaySelection.hidden = true;
            document.getElementById("inputs").classList.add('no-wrap');
            if (hasTpSupport) {
                this.displayTpSupport.classList.add('Input-group-end');
            } else if (hasSubVars) {
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
        if (hasClimatology) {
            this.extraDisplays.forEach((dpn) => {
                addChild(this.climatologyDisplay, dpn.render());
                dpn.build()
            });
            this.climatologyDisplay.hidden = true;
        }
        if (!hasSubTitle){ 
            this.menuCentral.hidden = true;
        //     this.titleDiv.classList.add('alone'); 
        }
        if(this.inputOrder.length) {
            this.changeInputOrder()
        }
    }

    public minimize(): void {
        this.menuInfo1.hidden = true;
        // this.menuInfo2.hidden = true;
        this.menuCentral.classList.remove('col-md');
        this.topBar.classList.add('smallBar');
    }
    public showFrame(): void {
        this.menuInfo1.hidden = false;
        // this.menuInfo2.hidden = false;
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

    public hideVar():void {
        this.displayVar.classList.add('display:none')
    }

    public update(): void {
        if (hasSpSupport) {
            this.displaySpSupport.textContent = this.parent.getState().support;
        }
        if (hasTpSupport) {
            this.displayTpSupport.textContent = this.parent.getState().tpSupport;
        }
        if (hasVars) {
            this.displayVar.textContent = this.parent.getState().varName;
        }
        if (hasSubVars) {
            this.displaySubVar.textContent = this.parent.getState().subVarName;
        }
        this.displaySelection.textContent = this.parent.getState().selection;
        this.displayParam.value = this.parent.getState().selectionParam + "";
        this.displayParam.disabled = !this.parent.getState().selectionParamEnable;
        if (this.parent.getState().climatology == true) {
            this.showClimFrame()
        } else {
            this.hideClimFrame()
        }
    }

    //Llamar en el configure antes del build
    public addButton(btn: BaseUiElement): void {
        this.extraBtns.push(btn)
    }

    public hideClimFrame(): void {
        // this.climatologyDisplay.classList.remove("d-grid");
        const elements: HTMLElement[] = Array.from(this.climatologyDisplay.children as HTMLCollectionOf<HTMLElement>);
        elements.forEach((el) => {
            if (el.innerHTML != '') {
                el.innerHTML == ''
                el.hidden = false
            } 
        })
        this.climatologyDisplay.hidden = true;
    }
    
    public showClimFrame(): void {
        let hasText: boolean = false
        const elements: HTMLElement[] = Array.from(this.climatologyDisplay.children as HTMLCollectionOf<HTMLElement>);
        elements.forEach((el: HTMLElement) => {
            if (el.innerHTML != '') {
                hasText = true
                el.hidden = false
            } else {
                hasText = false
                el.hidden = true
            }
        })
        // this.climatologyDisplay.classList.add("d-grid");
        this.climatologyDisplay.hidden = false;
    }

    public setExtraDisplay(displayId: string, displayTitle:string) {
        this.extraDisplays.push( new simpleDiv (displayId, displayTitle))
    }

    public updateExtraDisplay(displayId: string, displayTitle:string) {
        const elements: HTMLElement[] = Array.from(this.climatologyDisplay.children as HTMLCollectionOf<HTMLElement>);
        elements.forEach((el: HTMLElement) => {
            if (el.id == displayId) 
                el.innerHTML = displayTitle
        })
    }

    public setInputOrder(order:string[]) {
        this.inputOrder = order
    }

    public changeInputOrder() {
        let k: number = 0
        document.querySelectorAll('.inputDiv').forEach((elem:HTMLButtonElement)=>{
            elem.style.order = this.inputOrder[k]
            k++
        })
    }
}
