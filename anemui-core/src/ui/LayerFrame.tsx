import { createElement, addChild } from 'tsx-create-element';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { PaletteManager } from '../PaletteManager';
import { ChangeEvent } from 'react';
import Slider from 'bootstrap-slider';
import { LayerManager } from '../LayerManager';
import { showLayers, initialZoom }  from "../Env";
import Language from '../language/language';

export default class LayerFrame  extends BaseFrame {

    protected slider: Slider
    private baseDiv: HTMLElement
    private polDiv: HTMLElement
    private trpDiv: HTMLElement 

    public render():JSX.Element{
        let self=this;
        let mgr=PaletteManager.getInstance();
        let lmgr = LayerManager.getInstance();
        let baseLayers=lmgr.getBaseLayerNames();
        let topLayers=lmgr.getTopLayerNames();
        let selected = lmgr.getBaseSelected() ?? [];
        let i: number = 0;
        let prevGlobal: boolean | null = null;
        let element=
        (
            <div id="layer-frame" className='layerFrame btnSelect left'>
                <div className="layer-frame-header">
                    {this.parent.getTranslation('opciones_visualizacion')}
                </div>
                <div id="base-div">
                    <div className="buttonDiv baseDiv visible" onClick={()=>this.toggleSelect('baseDiv')}>
                        <span className="icon"><i className="bi bi-globe-europe-africa"></i></span>
                        <span className="text" aria-label='base'>
                            {this.parent.getTranslation('base_layer')}: {lmgr.getBaseSelected()}
                        </span>
                    </div>
                    <div className='row selectDiv baseDiv hidden'>
                        <div className='col p-0 inputDiv'>
                                { baseLayers.map((val,index)=>{
                                    i++;
                                    const isGlobal = lmgr.isBaseLayerGlobal(val);
                                    const group = isGlobal ? 'A' : 'B';
                                    const separator = (prevGlobal !== null && prevGlobal !== isGlobal)
                                        ? <div className="layer-group-separator"></div>
                                        : null;
                                    prevGlobal = isGlobal;
                                    if(selected.includes(val)){
                                        return (
                                            <div>
                                                {separator}
                                                <label className="radio">
                                                    <input id={"radio-" + i} className="baseLayer" value={val} type="checkbox" data-group={group} onChange={(event)=>self.changeBaseLayer(event.target.value)} checked></input>
                                                    <span className="radio-label"></span>
                                                    {val}
                                                </label>
                                            </div>
                                        )
                                    }
                                return (
                                    <div>
                                        {separator}
                                        <label className="radio">
                                            <input id={"radio-" + i} className="baseLayer" value={val} type="checkbox" data-group={group} onChange={(event)=>self.changeBaseLayer(event.target.value)}></input>
                                            <span className="radio-label"></span>
                                            {val}
                                        </label>
                                    </div>
                                )
                                })}
                        </div>
                        <div className='col-auto closeDiv p-0' onClick={()=>this.toggleSelect('baseDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                    </div>
                </div>
                <div id="trp-div">
                    <div className="buttonDiv trpDiv visible" onClick={()=>this.toggleSelect('trpDiv')}>
                        <span className="icon"><i className="bi bi-transparency"></i></span>
                        <span className="text"  aria-label='transparency'>
                            {this.parent.getTranslation('transparency')}: {mgr.getTransparency()}
                        </span>
                    </div>
                    <div className='row selectDiv trpDiv hidden'>
                        <div className='col p-0 inputDiv d-flex justify-content-center'>
                            <input className="selectDiv trpDiv" id="transparencySlider" data-slider-id='ex2Slider' type="text" data-slider-step="1"/>
                        </div>
                        <div className='col-auto closeDiv p-0' onClick={()=>this.toggleSelect('trpDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                    </div>
                </div>
                <div id="pol-div">
                    <div className="buttonDiv polDiv visible" onClick={()=>this.toggleSelect('polDiv')}>
                        <span className="icon"><i className="bi bi-map"></i></span>
                        <span className="text" aria-label='top'>
                            {this.parent.getTranslation('top_layer')}: {this.parent.getTranslation(lmgr.getTopSelected()) || lmgr.getTopSelected()}
                        </span>
                    </div>
                    <div className='row selectDiv polDiv hidden'>
                        <div className='col p-0 inputDiv'>
                            {topLayers.map((val, index) => {
                                const isSelected = lmgr.getTopSelected() == val;
                                return (
                                    <label className="radio">
                                        <input className="topLayer" value={val} type="radio" name="topLayer" onChange={(event) => self.changeTopLayer(event.target.value)} checked={isSelected}></input>
                                        <span className="radio-label"></span>
                                        {this.parent.getTranslation(val) || val}
                                    </label>
                                );
                            })}
                        </div>
                        <div className='col-auto closeDiv p-0' onClick={()=>this.toggleSelect('polDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                    </div>
                </div>
                <div id="print-div">
                    <div className="buttonDiv printDiv visible" onClick={()=>this.parent.getMap().exportMap()}>
                        <span className="icon"><i className="bi bi-printer"></i></span>
                        <span className="text">
                            {this.parent.getTranslation('imprimir_mapa') || 'Imprimir mapa'}
                        </span>
                    </div>
                </div>
            </div>
        );
        return element;
    }

    public toggleSelect(select: string){
        const isOpening = this.container.querySelector(".selectDiv." + select).classList.contains("hidden");
        if (isOpening) {
            // Cerrar todos los demás selectores antes de abrir éste
            ['baseDiv', 'polDiv', 'trpDiv'].forEach(other => {
                if (other !== select) {
                    const sel = this.container.querySelector(".selectDiv." + other);
                    const btn = this.container.querySelector(".buttonDiv." + other);
                    if (sel && !sel.classList.contains("hidden")) {
                        sel.classList.add("hidden");
                        sel.classList.remove("visible");
                        btn.classList.add("visible");
                        btn.classList.remove("hidden");
                    }
                }
            });
        }
        this.container.querySelector(".buttonDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".selectDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".buttonDiv." + select).classList.toggle("visible")
        this.container.querySelector(".selectDiv." + select).classList.toggle("visible")
    }

    public changeBaseLayer(value:string):void{
        const inputs = Array.from(document.getElementsByClassName("baseLayer")) as HTMLInputElement[];
        const clicked = inputs.find(inp => inp.value === value);
        const group = clicked?.dataset.group;

        if (group === 'A') {
            // Globales: radio — siempre una seleccionada, no se puede desmarcar
            inputs.forEach(inp => {
                if (inp.dataset.group === 'A') inp.checked = inp.value === value;
            });
            clicked.checked = true;
        } else {
            // Estatales: checkbox opcional — máximo una; se puede desmarcar
            if (clicked?.checked) {
                inputs.forEach(inp => {
                    if (inp.dataset.group === group && inp.value !== value) inp.checked = false;
                });
            }
        }

        const values = inputs.filter(inp => inp.checked).map(inp => inp.value);
        LayerManager.getInstance().setBaseSelected(values);
        this.parent.update();
    }

    public changeTopLayer(value:string):void{
        let mgr=LayerManager.getInstance();
        mgr.setTopSelected(value);
        this.parent.update();
        // this.container.querySelector("div.layerFrame").classList.remove("visible")
    }

    public build(){
        this.container = document.getElementById("layer-frame") as HTMLDivElement
        this.baseDiv = document.getElementById('base-div') as HTMLElement;
        this.polDiv = document.getElementById('pol-div') as HTMLElement;
        this.trpDiv = document.getElementById('trp-div') as HTMLElement;
        this.slider=new Slider(document.getElementById("transparencySlider"),{
            natural_arrow_keys: true,
            //tooltip: "always",
            min: 0,
            max: 100,
            value: 0,
        })
        this.slider.on('slideStop',(val:number)=>{
            let mgr=PaletteManager.getInstance();
            if(val==mgr.getTransparency())return;
            mgr.setTransparency(val)
            this.parent.update();
        })

        if (!showLayers){
            this.baseDiv.hidden = true;
            this.polDiv.hidden = true;
            this.trpDiv.hidden = true;
        } 
    }

    public minimize():void{
        this.container.classList.add("paletteSmall")
    }

    public showFrame():void{
        this.container.classList.remove("paletteSmall")
    }

    public update(): void {
        let mgr=PaletteManager.getInstance();
        let lmgr=LayerManager.getInstance();
        // let min = this.parent.getTimesJs().varMin[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        // let max = this.parent.getTimesJs().varMax[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let name:string; 
        if (this.parent.getTimesJs().legendTitle[this.parent.getState().varId] != undefined){
            const rawTitle = this.parent.getTimesJs().legendTitle[this.parent.getState().varId];
            const legendValues = Language.getInstance().getTranslation('legendValues');
            name = (legendValues && typeof legendValues === 'object' && (legendValues as any)[rawTitle]) ? (legendValues as any)[rawTitle] : rawTitle;
        }else {
            name = 'Unidades';
        }
        this.container.querySelector(".layerFrame span[aria-label=base]").textContent= this.parent.getTranslation('base_layer') +": "+lmgr.getBaseSelected();
        this.container.querySelector(".layerFrame span[aria-label=transparency]").textContent= this.parent.getTranslation('transparency') +": "+mgr.getTransparency();
        const topSelected = lmgr.getTopSelected();
        this.container.querySelector(".layerFrame span[aria-label=top]").textContent= this.parent.getTranslation('top_layer') +": "+(this.parent.getTranslation(topSelected) || topSelected);
        (Array.from(this.container.querySelectorAll("input.topLayer")) as HTMLInputElement[])
            .forEach(inp => { inp.checked = inp.value === topSelected; });
    }
}