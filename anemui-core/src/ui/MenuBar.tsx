import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsMenuItem, CsMenuInput, CsMenuItemListener } from './CsMenuItem';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { logo, logoStyle, hasButtons, hasSpSupport, hasSubVars, hasTpSupport, hasClimatology, hasVars, hasSelection, hasSelectionParam, varHasPopData, sbVarHasPopData}  from "../Env";

export interface MenuBarListener {
    spatialSelected(index: number, value?: string, values?: string[]): void;
    temporalSelected(index: number, value?: string, values?: string[]): void;
    varSelected(index: number, value?: string, values?: string[]): void;
    subVarSelected(index: number, value?: string, values?: string[]): void;
    selectionSelected(index: number, value?: string, values?: string[]): void;
    dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;
    selectionParamChanged(param: number): void;
}

export type simpleDiv = {
    role: string,
    title: string,
    subTitle: string
}

export class MenuBar extends BaseFrame {

    private title: string

    private menuopRight1: HTMLElement
    private menuInfo1: HTMLElement
    private menuInfo2: HTMLElement

    private topBar: HTMLElement
    private menuCentral: HTMLElement
    private loading: HTMLDivElement
    private loadingText: HTMLSpanElement
    private nodataText: HTMLSpanElement
    private titleDiv: HTMLElement
    private collapseMenu: HTMLElement
    private navMenu: HTMLElement

    private displaySpSupport: HTMLDivElement
    private displayTpSupport: HTMLDivElement
    private displayVar: HTMLDivElement
    private displaySubVar: HTMLDivElement
    private displaySelection: HTMLDivElement
    private displayParam: HTMLInputElement
    
    private inputsFrame: HTMLDivElement
    private extraDisplays: simpleDiv[];
    private inputOrder: string[];

    private climBtnArray: HTMLElement[]
    private spatialSupport: CsMenuItem;
    private temporalSupport: CsMenuItem;
    private variable: CsMenuItem;
    private subVariable: CsMenuItem;
    private selection: CsMenuItem;
    private selectionParam: CsMenuInput;
    private extraMenuItems: CsMenuItem[];
    private extraMenuInputs: CsMenuInput[];
    private dropDownOrder: string[]

    private popData: any;
    private extraBtns: BaseUiElement[];

    private selectionHidden: boolean;
    private paramHidden: boolean;

    private listener: MenuBarListener;

    private fetchingText : string = "Fetching data..."
    private errorText: string = "Could not retrieve data"

    constructor(_parent: BaseApp, _listener: MenuBarListener) {
        super(_parent)
        let self = this
        this.listener = _listener;

        this.extraDisplays = []
        this.extraBtns = []
        this.inputOrder = []

        if (hasSpSupport) {
            this.spatialSupport = new CsMenuItem("SpatialSupportDD", "Soporte Espacial", {
                valueSelected(origin, index, value, values) {
                    self.listener.spatialSelected(index, value, values)
                },
            });
        }
        if (hasVars) {
            this.variable = new CsMenuItem("VariableDD", "Variable", {
                valueSelected(origin, index, value, values) {
                    self.listener.varSelected(index, value, values)
                },
            });
        }
        if (hasSubVars) {
            this.subVariable = new CsMenuItem("SubVariableDD", "SubVariable", {
                valueSelected(origin, index, value, values) {
                    self.listener.subVarSelected(index, value, values)
                },
            });
        }
        if (hasTpSupport) {
            this.temporalSupport = new CsMenuItem("TemporalSupportDD", "Periodo", {
                valueSelected(origin, index, value, values) {
                    self.listener.temporalSelected(index, value, values)
                },
            });
        }
        if (hasSelection) {
            this.selection = new CsMenuItem("SelectionDD", "Selección", {
                valueSelected(origin, index, value, values) {
                    self.listener.selectionSelected(index, value, values)
                },
            });
        }
        if (hasSelectionParam) {
            this.selectionParam = new CsMenuInput("selectionParamInput", "Selección", {
                valueChanged: (newValue: number) => {  
                    this.listener.selectionParamChanged(newValue);
                },
            });
        }
        this.extraMenuItems = []
        this.extraMenuInputs = []
        this.extraBtns = []
        this.dropDownOrder = []
    }

    public setTitle(_title: string) {
        this.title = _title;
        document.title = _title;
    }

    public renderDisplay(display: simpleDiv, btnType?: string): JSX.Element {
        let divs = Array.from(document.getElementsByClassName("inputDiv") as HTMLCollectionOf<HTMLElement>)
        let maxId = divs.reduce(function(a, b){
            return Math.max(a, parseInt(b.id))
        }, 0);
        let nextId = (maxId + 1).toString()
        let element = (
            <li id={nextId} role={display.role} className={'inputDiv ' + btnType}></li>
        );
        return element;
    }

    public updateDisplay(_title: string, _id: string): void {
        this.inputsFrame.querySelector('[role=' + _id + ']').innerHTML = _title
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (
                <div id="TopBar" className="fixed-top" onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                    <div className={"navbar " + logoStyle}>
                        <img src={'./images/'+logo} useMap="#LogoMap"></img>
                        <map id="LogoMap">
                            <area shape="rect" coords="0,0,280,50" alt="csic" href="https://www.csic.es/es" target="_blank"></area>
                            <area shape="rect" coords="300,0,500,50" alt="plan_recuepracion" href="https://planderecuperacion.gob.es/" target="_blank"></area>
                            <area shape="rect" coords="510,0,670,50" alt="next_generation" href="https://next-generation-eu.europa.eu/index_en" target="_blank"></area>
                            <area shape="rect" coords="680,0,730,350" alt="lcsc" href="https://lcsc.csic.es/es/lcsc/" target="_blank"></area>
                        </map>
                    </div>
                    <div id="menu-title" className="menu-info text-left row mx-0 px-4">
                        <div className="col-title">
                            <h3 id="title">{this.title}</h3>
                        </div>
                        <div id="menu-central" className="col-info">
                            <ul id="inputs" className="nav-menu">
                            </ul>
                            <div className="collapse-menu" onClick={() => { self.mobileMenu() }}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <div className="col-auto">
                                <span className="ms-2" id="fetching-text" hidden>{ this.fetchingText }</span>
                                <span className="data-error-text" id="nodata-text" hidden>{ this.errorText }  </span>
                                <div className="spinner-grow text-info" role="status" hidden />
                            </div>
                        </div>
                        <div className="col menu-info  d-flex flex-row-reverse" id="info">
                        </div>
                    </div>
                </div>
            );
        return element;
    }

    public build() {
        this.container = document.getElementById("TopBar") as HTMLDivElement;
        this.topBar = document.getElementById('TopBar') as HTMLDivElement;
        this.menuCentral = document.getElementById('menu-central') as HTMLElement;
        this.titleDiv = document.getElementById('title') as HTMLElement;
        this.menuInfo1 = this.container.getElementsByClassName("menu-info")[0] as HTMLElement;
        this.loading = this.container.querySelector("[role=status]") as HTMLDivElement;
        this.inputsFrame = document.getElementById('inputs') as HTMLDivElement;
        this.loadingText = this.container.querySelector('#fetching-text') as HTMLSpanElement;
        this.nodataText = this.container.querySelector('#nodata-text') as HTMLSpanElement;
        this.collapseMenu = document.querySelector(".collapse-menu");
        this.navMenu = document.querySelector(".nav-menu");

        let height = this.loading.parentElement.getBoundingClientRect().height;

        height = height - 6;

        this.loading.style.height = height + "px";
        this.loading.style.width = height + "px";

        if (hasButtons) {
            if (hasSpSupport) {
                let dsp: simpleDiv = {role:'spSupport', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
                this.displaySpSupport = this.container.querySelector("[role=spSupport]")
                addChild(this.displaySpSupport, this.spatialSupport.render(this.parent.getState().support));
                this.spatialSupport.build(this.displaySpSupport)
            }
            if (hasVars) {
                let dsp: simpleDiv = {role:'var', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
                this.displayVar = this.container.querySelector("[role=var]")
                addChild(this.displayVar, this.variable.render(this.parent.getState().varName,varHasPopData))
                this.variable.build(this.displayVar)
                if (varHasPopData) this.variable.configPopOver(this.popData)
            }
            if (hasSubVars) {
                let dsp: simpleDiv = {role:'subVar', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
                this.displaySubVar = this.container.querySelector("[role=subVar]")
                this.displaySubVar.hidden = false;
                addChild(this.displaySubVar, this.subVariable.render(this.parent.getState().subVarName,sbVarHasPopData));
                this.subVariable.build(this.displaySubVar)
                if (sbVarHasPopData) this.subVariable.configPopOver(this.popData);
            }
            if (hasTpSupport) {
                let dsp: simpleDiv = {role:'tpSupport', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
                this.displayTpSupport = this.container.querySelector("[role=tpSupport]")
                this.displayTpSupport.hidden = false;
                addChild(this.displayTpSupport, this.temporalSupport.render(this.parent.getState().tpSupport));
                this.temporalSupport.build(this.displayTpSupport);
            }
            if (hasSelection) {
                let dsp: simpleDiv = {role:'selection', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
                this.displaySelection = this.container.querySelector("[role=selection]")
                this.displaySelection.hidden = false;
                addChild(this.displaySelection, this.selection.render(this.parent.getState().selection));
                this.selection.build(this.displaySelection);
            }
            if (hasSelectionParam) {
                let dsp: simpleDiv = {role:'selection-param', title:'', subTitle:''}
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicInput'));
                this.displayParam = this.container.querySelector("[role=selection-param]")
                this.displayParam.hidden = false;
                addChild(this.displayParam, this.selectionParam.render(this.parent.getState().selectionParam+''));
                this.selectionParam.build(this.displayParam);
            }
            if (hasClimatology) {
                this.extraDisplays.forEach((dsp) => {
                    addChild(this.inputsFrame, this.renderDisplay(dsp, 'climBtn'));
                    this.extraMenuItems.forEach((dpn) => {
                        if (dpn.id == dsp.role) {
                            let container: HTMLDivElement = document.querySelector("[role=" + dsp.role + "]")
                            addChild(container, dpn.render(dsp.subTitle,false));
                            dpn.build(container)
                        }
                    });
                    if (this.extraMenuInputs.length > 0) {
                        this.extraMenuInputs.forEach((input) => {
                            if (input.id == dsp.role) {
                                let container: HTMLDivElement = document.querySelector("[role=" + dsp.role + "]")
                                addChild(container, input.render(this.parent.getState().selectionParam+''));
                                input.build(container)
                            }
                        })
                    }
                });
            }
            if(this.dropDownOrder.length) {
                this.changeMenuItemOrder()
            }
            this.climBtnArray = Array.from(document.getElementsByClassName("climBtn") as HTMLCollectionOf<HTMLElement>);
            this.climBtnArray.forEach((btn) =>{
                btn.hidden = true;
            })

            if (this.title.length >= 20) this.titleDiv.classList.add('smallSize');

            if(this.inputOrder.length) {
                this.changeInputOrder()
            }
        }

        
    }

    public mobileMenu() {
        this.collapseMenu.classList.toggle("active");
        this.navMenu.classList.toggle("active");
    }

    public minimize(): void {
        this.menuInfo1.hidden = true;
        // this.menuCentral.classList.remove('col-md');
        this.topBar.classList.add('smallBar');
    }
    public showFrame(): void {
        this.menuInfo1.hidden = false;
        // this.menuCentral.classList.add('col-md');
        this.topBar.classList.remove('smallBar');
    }
    public showLoading(): void {
        if (this.loading) this.loading.hidden = false; 
        if (this.loadingText) {
            this.loadingText.hidden = false;          
            this.loadingText.classList.add('blinking-text'); 
        }
    }
    
    public hideLoading(): void {
        if (this.loading) this.loading.hidden = true; 
        if (this.loadingText) {
            this.loadingText.hidden = true;      
            this.loadingText.classList.add('display:none')
        }
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
        if (!hasButtons) return

        if (hasSpSupport) {
            this.displaySpSupport.querySelector('.sub-title').innerHTML = this.parent.getState().support;
            // this.displaySpSupport.setSubTitle() ;
        }
        if (hasTpSupport) {
            this.displayTpSupport.querySelector('.sub-title').innerHTML = this.parent.getState().tpSupport;
        }
        if (hasVars) {
            this.displayVar.querySelector('.sub-title').innerHTML = this.parent.getState().varName;
        }
        if (hasSubVars) {
            this.displaySubVar.querySelector('.sub-title').innerHTML = this.parent.getState().subVarName;
        } 
        if (hasSelection) {
            this.displaySelection.querySelector('.sub-title').innerHTML = this.parent.getState().selection;
        }
        if (hasSelectionParam) {
            this.selectionParam.value = this.parent.getState().selectionParam
        }   
        
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
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = true;
        })
    }
    
    public showClimFrame(): void {
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = false;
        })
    }

    public setExtraDisplay(type: number, id: string, displayTitle:string, options: string[]) { 
        this.extraDisplays.push( { role: id, title: displayTitle, subTitle: options[0] })
        let listener = this.listener

        switch (type) {
            case 1:
                this.extraMenuItems.push( new CsMenuItem (id , displayTitle,  {
                    valueSelected(origin, index, value, values) {
                        listener.dropdownSelected(id, index, value, values)
                    },
                }))
                for (let i = 0; i < this.extraMenuItems.length; i++) {
                    if (this.extraMenuItems[i]['id'] == id) this.extraMenuItems[i].setValues(options);
                }
                break;
            case 2:
                this.extraMenuInputs.push( new CsMenuInput(id, displayTitle, {
                    valueChanged: (newValue: number) => {  
                        listener.selectionParamChanged(newValue);
                    }, 
                }, +options[0]))
                break;
        }
        
    }

    public updateExtraDisplay(type: number, dspRole: string, displayTitle:string, options: string[]) {
        switch (type) {
            case 1:
                this.extraMenuItems.forEach((dpn) => {
                    if (dpn.id == dspRole) {
                        dpn.setTitle(displayTitle)
                        dpn.setSubTitle(options[0])
                        dpn.setValues(options)
                    }
                });
                break;
            case 2:
                this.extraMenuInputs.forEach((inp) => {
                    if (inp.id == dspRole) {
                        inp.setTitle(displayTitle)
                    }
                });
                break;    
        }
    }

    public updateExtraDrpodown(_dpn: string, title: string, sbTitle: string) {
        this.extraMenuItems.forEach((dpn) => {
            if (dpn.id == _dpn) {
                dpn.setSubTitle(sbTitle)
            }
        });
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

    public setSupportValues(_supportValues: string[]) {
        this.spatialSupport.setValues(_supportValues)
    }

    public setTpSupportValues(_tpSupportValues: string[]) {
        if (hasTpSupport) {
            this.temporalSupport.setValues(_tpSupportValues)
        }
    }

    public configTpSupport(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasTpSupport) return;
        this.temporalSupport.config(visible, newText);
    }

    public setVariables(_variables: string[]) {
        this.variable.setValues(_variables, varHasPopData);
    }

    public configVariables(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasVars) return;
        this.variable.config(visible, newText);
        if (varHasPopData) {
            this.variable.configPopOver(this.popData);
        }
    }

    public setSubVariables(_variables: string[]) {
        this.subVariable.setValues(_variables, sbVarHasPopData);
    }

    public configSubVariables(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasSubVars) return;
        this.subVariable.config(visible, newText);
        if (sbVarHasPopData) {
            this.subVariable.configPopOver(this.popData);
        }
    }

    public setSelection(_selections: string[]) {
        if (hasSelection) {
            this.selection.setValues(_selections);
        }
    }

    public configSelection(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasSelection) return;
        this.selection.config(visible, newText);
    }

    public configSelectionParam(visible: boolean, newText?: string) {
        if (!hasButtons || !hasSelectionParam) return;
        this.selectionParam.config(visible, newText);
    }

    public updateMenuItem(btnName: string, btnTitle: string, options: string[]) {
        for (let i = 0; i < this.extraMenuItems.length; i++) {
            if (this.extraMenuItems[i]['id'] == btnName) {
                 this.extraMenuItems[i].setTitle(btnTitle, btnName)
            }
        }
    }

    public setPopIfo(popData: any) {
        this.popData = popData
    }

    public setMenuItemOrder(order:string[]) {
        this.dropDownOrder = order
    }

    public changeMenuItemOrder() {
        let k: number = 0
        document.querySelectorAll('.ordBtn').forEach((elem:HTMLButtonElement)=>{
            elem.style.order = this.dropDownOrder[k]
            k++
        })
    }
<<<<<<< Updated upstream
=======

    // public selectFirstSpatialSupportValue(): void {
    //     this.spatialSupport.selectFirstValidValue();
    // }   
>>>>>>> Stashed changes
}
