import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsMenuItem, CsMenuItemListener } from './CsMenuItem';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { logo, logoStyle, hasSpSupport, hasSubTitle, hasSubVars, hasTpSupport, hasClimatology, hasVars, hasButtons, varHasPopData, sbVarHasPopData}  from "../Env";

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

// export class simpleDiv extends BaseUiElement {
//     // protected container: HTMLDivElement;
//     public id: string
//     public role: string
//     public title: string

//     constructor( _id: string, _role: string, _title: string) {
//        super();
//         this.id = _id;
//         this.role = _role;
//         this.title = _title;
//     }
//     public build(): void {
//         // this.container = document.getElementById(this.containerId) as HTMLDivElement
//     }
//     public minimize(): void {
//         throw new Error("Method not implemented.");
//     }
//     public showFrame(): void {
//         throw new Error("Method not implemented.");
//     }
    
//     public render(): JSX.Element {
//         // return (<div id={this.id} className="input-group-text">{this.title}</div>);
//         return (<li id={this.id} role={this.role}>{this.title}</li>);
//     }

//     /* public getDiv(): HTMLDivElement {
//         return this.container;
//     } */
// }

export class MenuBar extends BaseFrame {

    private title: string

    private menuopRight1: HTMLElement
    private menuInfo1: HTMLElement
    private menuInfo2: HTMLElement

    private topBar: HTMLElement
    private menuCentral: HTMLElement
    private loading: HTMLDivElement
    private loadingText: HTMLSpanElement
    private titleDiv: HTMLElement

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
    private extraDropDowns: CsMenuItem[];
    private dropDownOrder: string[]
    // private containerHandler: HTMLElement;

    private popData: any;
    private extraBtns: BaseUiElement[];

    private selectionHidden: boolean;
    private paramHidden: boolean;

    private listener: MenuBarListener;

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
        this.extraDropDowns = []
        this.extraBtns = []
        this.dropDownOrder = []
    }


    public setTitle(_title: string) {
        this.title = _title;
        document.title = _title;
    }

    private fireParamChanged(): void {
        this.listener.selectionParamChanged(parseFloat(this.displayParam.value));
    }

    public renderDisplay(display: simpleDiv, btnType?: string): JSX.Element {
        let divs = Array.from(document.getElementsByClassName("inputDiv") as HTMLCollectionOf<HTMLElement>)
        let maxId = divs.reduce(function(a, b){
            return Math.max(a, parseInt(b.id))
        }, Number.NEGATIVE_INFINITY);
        let nextId = (maxId + 1).toString()
        let values = this.extraDropDowns
        let element = (
            <li id={nextId} role={display.role} className={'inputDiv ' + btnType}></li>
        );
        return element;
    }

    public updateDisplay(_title: string, _id: string): void {
    //     // querySelector(".navbar-btn-title span").textContent  = _title
        this.inputsFrame.querySelector('[role=' + _id + ']').innerHTML = _title
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
                            <div className="col">
                                <h3 id="title">{this.title}</h3>
                            </div>
                            <div id="menu-central" className="col text-left">
                                <form onSubmit={() => { this.fireParamChanged(); return false }}>
                                        <ul id="inputs">
                                            <li id="1" role="selection" className="inputDiv">{this.parent.getState().selection}</li>
                                        </ul>
                                    <input role="selection-param" type="text" className="form-control form-control-sm autoSizingInputGroup"
                                            placeholder="Selection Param" value={this.parent.getState().selectionParam}
                                            disabled={!this.parent.getState().selectionParamEnable}
                                            onChange={() => { this.fireParamChanged(); return false }} />
                                        <div className="col-auto">
                                            <div className="spinner-grow text-info" role="status" hidden />
                                        </div>
                                </form>
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
        this.inputsFrame = document.getElementById('inputs') as HTMLDivElement;
        this.loadingText = this.container.querySelector('#fetching-text') as HTMLSpanElement;
        this.climatologyDisplay = document.getElementById('climatologyDisplay') as HTMLDivElement;

        let height = this.loading.parentElement.getBoundingClientRect().height;
        height = height - 6;

        this.loading.style.height = height + "px";
        this.loading.style.width = height + "px";

        if (hasSpSupport) {
            let dsp: simpleDiv = {role:'spSupport', title:'', subTitle:''}
            addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
            this.displaySpSupport = this.container.querySelector("[role=spSupport]")
            addChild(this.displaySpSupport, this.spatialSupport.render(this.spatialSupport.getText(),this.parent.getState().support));
            this.spatialSupport.build(this.displaySpSupport)
        }
        if (hasVars) {
            let dsp: simpleDiv = {role:'var', title:'', subTitle:''}
            addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
            this.displayVar = this.container.querySelector("[role=var]")
            addChild(this.displayVar, this.variable.render(this.variable.getText(),this.parent.getState().varName,varHasPopData))
            this.variable.build(this.displayVar)
            if (varHasPopData) this.variable.configPopOver(this.popData)
        }
        if (hasSubVars) {
            let dsp: simpleDiv = {role:'subVar', title:'', subTitle:''}
            addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
            this.displaySubVar = this.container.querySelector("[role=subVar]")
            this.displaySubVar.hidden = false;
            addChild(this.displaySubVar, this.subVariable.render(this.subVariable.getText(),this.parent.getState().subVarName,sbVarHasPopData));
            this.subVariable.build(this.displaySubVar)
            if (sbVarHasPopData) this.subVariable.configPopOver(this.popData);
        }
        if (hasTpSupport) {
            let dsp: simpleDiv = {role:'tpSupport', title:'', subTitle:''}
            addChild(this.inputsFrame, this.renderDisplay(dsp, 'basicBtn'));
            this.displayTpSupport = this.container.querySelector("[role=tpSupport]")
            this.displayTpSupport.hidden = false;
            addChild(this.displayTpSupport, this.temporalSupport.render(this.temporalSupport.getText(), this.parent.getState().tpSupport));
            this.temporalSupport.build(this.displayTpSupport);
        }
        
        this.displaySelection = this.container.querySelector("[role=selection]")
        this.displayParam = this.container.querySelector("[role=selection-param]")
        if (this.selectionHidden) {
            this.displaySelection.hidden = true;
            document.getElementById("inputs").classList.add('no-wrap');
        }
        if (this.paramHidden) {
            this.displayParam.hidden = true;
            document.getElementById("inputs").classList.add('no-wrap');
        }
        if (hasClimatology) {
            this.extraDisplays.forEach((dsp) => {
                addChild(this.inputsFrame, this.renderDisplay(dsp, 'climBtn'));
                this.extraDropDowns.forEach((dpn) => {
                    if (dpn.id == dsp.role) {
                        let container: HTMLDivElement = document.querySelector("[role=" + dsp.role + "]")
                        addChild(container, dpn.render(dsp.title, dsp.subTitle,false));
                        dpn.build(container)
                    }
                });
            });
        }

        if(this.dropDownOrder.length) {
            this.changeDropDownOrder()
        }

        this.climBtnArray = Array.from(document.getElementsByClassName("climBtn") as HTMLCollectionOf<HTMLElement>);
        
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = true;
        })

        if (this.title.length >= 20) this.titleDiv.classList.add('smallSize');

        // if (!hasSubTitle){ 
        //     this.menuCentral.hidden = true;
        //     this.titleDiv.classList.add('alone'); 
        // }
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
        if (hasSpSupport) {
            this.displaySpSupport.querySelector('.sub-title').innerHTML = this.parent.getState().support;
            // this.displaySpSupport.setSubTitle() ;
        }
        if (hasTpSupport) {
            // this.displayTpSupport.textContent = this.parent.getState().tpSupport;
            this.displayTpSupport.querySelector('.sub-title').innerHTML = this.parent.getState().tpSupport;
        }
        if (hasVars) {
            // this.displayVar.textContent = this.parent.getState().varName;
            this.displayVar.querySelector('.sub-title').innerHTML = this.parent.getState().varName;
        }
        if (hasSubVars) {
            // this.displaySubVar.textContent = this.parent.getState().subVarName;
            this.displaySubVar.querySelector('.sub-title').innerHTML = this.parent.getState().subVarName;
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
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = true;
        })
    }
    public showClimFrame(): void {
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = false;
        })
    }

    public setExtraDisplay(id: string, displayTitle:string, options: string[]) { 
        this.extraDisplays.push( { role: id, title: displayTitle, subTitle: options[0] })
        let listener = this.listener

        this.extraDropDowns.push( new CsMenuItem (id , displayTitle,  {
            valueSelected(origin, index, value, values) {
                listener.dropdownSelected(id, index, value, values)
            },
        }))

        for (let i = 0; i < this.extraDropDowns.length; i++) {
            if (this.extraDropDowns[i]['id'] == id) this.extraDropDowns[i].setValues(options);
        }
    }

    public updateExtraDisplay(dspRole: string, displayTitle:string, options: string[]) {
        let el = this.inputsFrame.querySelector('[role=' + dspRole + ']')
        el.innerHTML = ''
        this.extraDropDowns.forEach((dpn) => {
            if (dpn.id == dspRole) {
                dpn.setValues(options)
                addChild(el, dpn.render(displayTitle, options[0], false));
            }
            console.log(dpn)
        });
    }

    public updateExtraDrpodown(_dpn: string, title: string, sbTitle: string) {
        this.extraDropDowns.forEach((dpn) => {
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
        this.selection.setValues(_selections);
    }

    public configSelection(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons) return;
        this.selection.config(visible, newText);
    }

    public updateExtraDropdown(btnName: string, btnTitle: string, options: string[]) {
        for (let i = 0; i < this.extraDropDowns.length; i++) {
            if (this.extraDropDowns[i]['id'] == btnName) {
                // this.extraDropDowns[i].setTitle(btnTitle, btnName)
                
            }
        }
    }

    public setPopIfo(popData: any) {
        this.popData = popData
    }

    public setDropDownOrder(order:string[]) {
        this.dropDownOrder = order
    }

    public changeDropDownOrder() {
        let k: number = 0
        document.querySelectorAll('.ordBtn').forEach((elem:HTMLButtonElement)=>{
            elem.style.order = this.dropDownOrder[k]
            k++
        })
    }
}
