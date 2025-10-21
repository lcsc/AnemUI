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
    selectionParamChanged(param: number): void;
    dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;
    inputParamChanged(id: string, param: number): void;
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
    private collapseMenuMb: HTMLElement
    private navMenuMb: HTMLElement
    private logoMap: HTMLElement

    private displaySpSupport: HTMLDivElement
    private displaySpSupportMb: HTMLDivElement
    private displayTpSupport: HTMLDivElement
    private displayTpSupportMb: HTMLDivElement
    private displayVar: HTMLDivElement
    private displayVarMb: HTMLDivElement
    private displaySubVar: HTMLDivElement
    private displaySubVarMb: HTMLDivElement
    private displaySelection: HTMLDivElement
    private displaySelectionMb: HTMLDivElement
    private displayParam: HTMLInputElement
    private displayParamMb: HTMLInputElement

    private inputsFrame: HTMLDivElement
    private inputsFrameMobile: HTMLDivElement
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
    private logoMaps:string[]

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
                valueChanged: (origin, newValue: number) => {  
                    this.listener.selectionParamChanged(newValue);
                },
            });
        }
        this.extraMenuItems = []
        this.extraMenuInputs = []
        this.extraBtns = []
        this.dropDownOrder = []
        this.logoMaps = []
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

    /**
     * Helper method to add menu items to both desktop and mobile frames
     */
    private addMenuItemToBothFrames(
        role: string,
        btnType: string,
        menuItem: CsMenuItem | CsMenuInput,
        renderFunction: () => JSX.Element,
        displayProperty: string
    ): void {
        // Desktop version
        let dsp: simpleDiv = { role: role, title: '', subTitle: '' };
        addChild(this.inputsFrame, this.renderDisplay(dsp, btnType));
        const desktopContainer = this.container.querySelector(`[role=${role}]`) as HTMLDivElement;
        addChild(desktopContainer, renderFunction());
        (this as any)[displayProperty] = desktopContainer;
        if (menuItem instanceof CsMenuItem) {
            menuItem.build(desktopContainer);
        } else if (menuItem instanceof CsMenuInput) {
            menuItem.build(desktopContainer);
        }

        // Mobile version
        let dspMb: simpleDiv = { role: role + 'Mb', title: '', subTitle: '' };
        addChild(this.inputsFrameMobile, this.renderDisplay(dspMb, btnType));
        const mobileContainer = this.container.querySelector(`[role=${role}Mb]`) as HTMLDivElement;
        addChild(mobileContainer, renderFunction());
        (this as any)[displayProperty + 'Mb'] = mobileContainer;
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (
                <div id="TopBar" className="fixed-top" onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                    {/* Desktop TopBar */}
                    <div className="topbar-desktop">
                        <div className={"navbar " + logoStyle}>
                            <img src={'./images/'+logo} useMap="#LogoMap"></img>
                            <map id="LogoMap">

                            </map>
                        </div>
                        <div id="menu-title" className="menu-info text-left row mx-0">
                            <div className="col-title">
                                <h3 id="title">{this.title}</h3>
                            </div>
                            <div id="menu-central" className="col-info">
                                <ul id="inputs" className="nav-menu">
                                </ul>
                                <div className="collapse-menu" onClick={() => { self.desktopMenu() }}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            <div className="col menu-info d-flex flex-row-reverse" id="info">
                            </div>
                        </div>
                    </div>

                    {/* Mobile TopBar */}
                    <div className="topbar-mobile">
                        <div className="mobile-top-row">
                            <div id="menu-central-mobile" className="mobile-menu-central">
                                <ul id="inputs-mobile" className="nav-menu-mb">
                                </ul>
                                <div className="collapse-menu-mb" onClick={() => { self.mobileMenu() }}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            <div className={"navbar " + logoStyle}>
                                <img src={'./images/logo_aemet.svg'} useMap="#LogoMapMobile"></img> {/* incluir en env.js */}
                                <map id="LogoMapMobile">

                                </map>
                            </div>
                            <div className="mobile-menu-info d-flex flex-row-reverse" id="info-mobile">
                            </div>
                        </div>
                        <div className="mobile-title-row">
                            <h3 id="title-mobile">{this.title}</h3>
                        </div>
                    </div>

                    <div className="col-auto">
                        <span className="ms-2" id="fetching-text" hidden>{ this.fetchingText }</span>
                        <span className="data-error-text" id="nodata-text" hidden>{ this.errorText }  </span>
                        <div className="spinner-grow text-info" role="status" hidden />
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
        this.inputsFrameMobile = document.getElementById('inputs-mobile') as HTMLDivElement;
        this.loadingText = this.container.querySelector('#fetching-text') as HTMLSpanElement;
        // this.nodataText = this.container.querySelector('#nodata-text') as HTMLSpanElement;
        this.collapseMenu = document.querySelector(".collapse-menu");
        this.navMenu = document.querySelector(".nav-menu");
        this.collapseMenuMb = document.querySelector(".collapse-menu-mb");
        this.navMenuMb = document.querySelector(".nav-menu-mb");
        this.logoMap = document.getElementById('LogoMap') as HTMLElement;

        let height = this.loading.parentElement.getBoundingClientRect().height;

        height = height - 6;

        this.loading.style.height = height + "px";
        this.loading.style.width = height + "px";

        if (hasButtons) {
            if (hasSpSupport) {
                this.addMenuItemToBothFrames(
                    'spSupport',
                    'basicBtn',
                    this.spatialSupport,
                    () => this.spatialSupport.render(this.parent.getState().support),
                    'displaySpSupport'
                );
            }
            if (hasVars) {
                this.addMenuItemToBothFrames(
                    'var',
                    'basicBtn',
                    this.variable,
                    () => this.variable.render(this.parent.getState().varName, varHasPopData),
                    'displayVar'
                );
                if (varHasPopData) this.variable.configPopOver(this.popData);
            }
            if (hasSubVars) {
                this.addMenuItemToBothFrames(
                    'subVar',
                    'basicBtn',
                    this.subVariable,
                    () => this.subVariable.render(this.parent.getState().subVarName, sbVarHasPopData),
                    'displaySubVar'
                );
                this.displaySubVar.hidden = false;
                this.displaySubVarMb.hidden = false;
                if (sbVarHasPopData) this.subVariable.configPopOver(this.popData);
            }
            if (hasTpSupport) {
                this.addMenuItemToBothFrames(
                    'tpSupport',
                    'basicBtn',
                    this.temporalSupport,
                    () => this.temporalSupport.render(this.parent.getState().tpSupport),
                    'displayTpSupport'
                );
                this.displayTpSupport.hidden = false;
                this.displayTpSupportMb.hidden = false;
            }
            if (hasSelection) {
                this.addMenuItemToBothFrames(
                    'selection',
                    'basicBtn',
                    this.selection,
                    () => this.selection.render(this.parent.getState().selection),
                    'displaySelection'
                );
                this.displaySelection.hidden = this.selectionHidden;
                this.displaySelectionMb.hidden = this.selectionHidden;
            }
            if (hasSelectionParam) {
                this.addMenuItemToBothFrames(
                    'selection-param',
                    'basicInput',
                    this.selectionParam,
                    () => this.selectionParam.render(this.parent.getState().selectionParam + ''),
                    'displayParam'
                );
                this.displayParam.hidden = false;
                this.displayParamMb.hidden = false;
            }
            if (hasClimatology) {
                this.extraDisplays.forEach((dsp) => {
                    addChild(this.inputsFrame, this.renderDisplay(dsp, 'climBtn'));
                    addChild(this.inputsFrameMobile, this.renderDisplay(dsp, 'climBtn'));
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
        this.setupMobileDropdowns();
        this.buildLogoMaps();
        
    }

    public desktopMenu() {
        this.collapseMenu.classList.toggle("active");
        this.navMenu.classList.toggle("active");
    }

    public mobileMenu() {
        this.collapseMenuMb.classList.toggle("active");
        this.navMenuMb.classList.toggle("active");
    }

    private setupMobileDropdowns(): void {
        // Solo para móvil
        if (window.innerWidth <= 768) {
            document.addEventListener('click', (e) => {
                const button = (e.target as HTMLElement).closest('.dpdown-button');
                if (button) {
                    e.preventDefault();
                    const parent = button.closest('.inputDiv');
                    // Cerrar otros
                    document.querySelectorAll('.inputDiv.active').forEach(el => {
                        if (el !== parent) el.classList.remove('active');
                    });
                    // Toggle actual
                    parent?.classList.toggle('active');
                } else if (!(e.target as HTMLElement).closest('.inputDiv')) {
                    // Cerrar todos si click fuera
                    document.querySelectorAll('.inputDiv.active').forEach(el => {
                        el.classList.remove('active');
                    });
                }
            });
        }
    }

    public setLogoMaps(_logoMaps:string[]){
        this.logoMaps = _logoMaps
    }

    public buildLogoMaps(){
        if (!this.logoMaps || this.logoMaps.length === 0 || !this.logoMap) {
            return;
        }
        this.logoMaps.forEach((logoMap) => {
            let attrs = logoMap.split('-')
            const area = document.createElement('area');
            area.shape = 'rect';
            area.coords = attrs[0];
            area.alt = attrs[1];
            area.href = attrs[2];
            area.target = '_blank';
            this.logoMap.appendChild(area);
        });
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
        if (hasSelection) {
            this.displaySelection.hidden = true;
        }
    }

    public showSelection() {
        if (hasSelection) {
            this.displaySelection.hidden = false;
        }
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
            this.displaySpSupportMb.querySelector('.sub-title').innerHTML = this.parent.getState().support;
        }
        if (hasTpSupport) {
            this.displayTpSupport.querySelector('.sub-title').innerHTML = this.parent.getState().tpSupport;
            this.displayTpSupportMb.querySelector('.sub-title').innerHTML = this.parent.getState().tpSupport;
        }
        if (hasVars) {
            this.displayVar.querySelector('.sub-title').innerHTML = this.parent.getState().varName;
            this.displayVarMb.querySelector('.sub-title').innerHTML = this.parent.getState().varName;
        }
        if (hasSubVars) {
            this.displaySubVar.querySelector('.sub-title').innerHTML = this.parent.getState().subVarName;
            this.displaySubVarMb.querySelector('.sub-title').innerHTML = this.parent.getState().subVarName;
        } 
        if (hasSelection) {
            this.displaySelection.querySelector('.sub-title').innerHTML = this.parent.getState().selection;
            this.displaySelectionMb.querySelector('.sub-title').innerHTML = this.parent.getState().selection;
        }
        if (hasSelectionParam) {
            this.selectionParam.value = this.parent.getState().selectionParam;
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
                    valueChanged: (origin, newValue: number) => {
                        listener.inputParamChanged(id, newValue);
                    },
                }, +options[0], +options[1], +options[2]))
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
        } else {
            console.warn("MenuBar.setSelection - hasSelection is false, but setSelection was called!");
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

    // public selectFirstSpatialSupportValue(): void {
    //     this.spatialSupport.selectFirstValidValue();
    // }   

}
