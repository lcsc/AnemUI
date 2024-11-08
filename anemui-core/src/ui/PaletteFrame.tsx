import { createElement, addChild } from 'tsx-create-element';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { PaletteManager } from '../PaletteManager';
import { ChangeEvent } from 'react';
import Slider from 'bootstrap-slider';
import { mgrs } from 'proj4';
import { LayerManager } from '../LayerManager';
import { showLayers }  from "../Env";

export default class PaletteFrame  extends BaseFrame{

    protected slider: Slider
    private baseDiv: HTMLElement
    private dataDiv: HTMLElement
    private trpDiv: HTMLElement
    private uncertaintyFrame: HTMLElement; 

    public render():JSX.Element{
        let self=this;
        let values= [...this.parent.getLegendValues()].reverse();
        let texts=[...this.parent.getLegendText()].reverse();
        let mgr=PaletteManager.getInstance();
        let lmgr = LayerManager.getInstance();
        let ptr=mgr.getPainter();
        let min = this.parent.getTimesJs().varMin[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let max = this.parent.getTimesJs().varMax[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let name = this.parent.getState().legendTitle;
        let palettes=mgr.getPalettesNames();
        let baseLayers=lmgr.getBaseLayerNames();
        let topLayers=lmgr.getTopLayerNames();
        let bgcolor;
        let color = '#ffffff';
        let uncertaintyLayer = this.parent.getState().uncertaintyLayer;
        // mgr.setUncertaintyLayerChecked(true) //  ------------ ORIGINAL, por defecto está activada
        mgr.setUncertaintyLayerChecked(false)
        let element=
        (<div id="PaletteFrame" className='paletteFrame' onMouseOver={(event:React.MouseEvent)=>{mouseOverFrame(self,event)}}>
            <div className="info legend">
                <div id="units"><span className='legendText'>{name}</span><br/></div>
                {values.map((val, index) => (
                    <div style={{background:ptr.getColorString(val,min,max), color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span className='legendText smallText'> {texts[index]}</span><br/></div>
                 ))}
                <div id="legendBottom"></div> 
            </div>
            <div className='paletteSelect btnSelect right'>
                <div id="base-div">
                    <div className="buttonDiv baseDiv visible" onClick={()=>this.toggleSelect('baseDiv')}>
                        <span className="icon"><i className="bi bi-globe-europe-africa"></i></span>
                        <span className="text" aria-label='base'>
                            {this.parent.getTranslation('base_layer')}: {lmgr.getBaseSelected()}
                        </span>
                    </div>
                    <div className='row selectDiv baseDiv hidden'>
                        <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('baseDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                        <div className='col-8 p-0'>
                            <select className="form-select form-select-sm" aria-label="Change Base" onChange={(event)=>self.changeBaseLayer(event.target.value)}>
                                {baseLayers.map((val,index)=>{
                                    if(lmgr.getBaseSelected()==val){
                                        return (<option value={val} selected>{val}</option>)
                                    }
                                return (<option value={val}>{val}</option>)
                                })}
                            </select>
                        </div>
                    </div>
                </div>
                <div id="palette-div">
                    <div className="buttonDiv paletteDiv visible"  onClick={()=>this.toggleSelect('paletteDiv')}>
                        <span className="icon"><i className="bi bi-palette"></i></span>
                        <span className="text" aria-label='paleta'>
                            {this.parent.getTranslation('paleta')}: {mgr.getSelected()}
                        </span>
                    </div>
                    <div className='row selectDiv paletteDiv hidden'>
                        <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('paletteDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                        <div className='col-8 p-0'>
                            <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>{self.changePalette(event.target.value)}}>
                                {palettes.map((val,index)=>{
                                    if (val != 'uncertainty') {
                                        if(mgr.getSelected()==val){
                                            return (<option value={val} selected>{val}</option>)
                                        }
                                        return (<option value={val}>{val}</option>)
                                    }
                                })}
                            </select>
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
                        <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('trpDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                        <div className='col-8 p-0'>
                            <input className="selectDiv trpDiv" id="transparencySlider" data-slider-id='ex2Slider' type="text" data-slider-step="1"/>
                        </div>
                    </div>
                </div>
                <div id="data-div">
                    <div className="buttonDiv dataDiv visible" onClick={()=>this.toggleSelect('dataDiv')}>
                        <span className="icon"><i className="bi bi-map"></i></span>
                        <span className="text" aria-label='top'>
                            {this.parent.getTranslation('top_layer')}: Politico
                        </span>
                    </div>
                    <div className='row selectDiv dataDiv hidden'>
                        <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('dataDiv')}>
                            <span className="icon"><i className="bi bi-x"></i></span>
                        </div>
                        <div className='col-8 p-0'>
                            <select className="form-select form-select-sm" aria-label="Change Base" onChange={(event)=>self.changeTopLayer(event.target.value)}>
                                {topLayers.map((val,index)=>{
                                    let trVal = this.parent.getTranslation(val)
                                    if(lmgr.getTopSelected()==val){
                                        return (<option value={val} selected>{this.parent.getTranslation(val)}</option>)
                                    }
                                    return (<option value={val}>{val}</option>)
                                })}
                            </select>
                        </div>
                    </div>
                </div>
                <div id="unc-div">
                    {uncertaintyLayer &&
                        <div>
                            <div className="buttonDiv uncDiv visible" onClick={()=>this.toggleSelect('uncDiv')}>
                                <span className="icon"><i className="bi bi-check-circle"></i></span>
                                <span className="text"  id='uncertainty-text' aria-label='uncertainty'>
                                    {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyLayerChecked()}
                                </span>
                            </div>
                            <div className='row selectDiv uncDiv hidden'>
                                <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('uncDiv')}>
                                    <span className="icon"><i className="bi bi-x"></i></span>
                                </div>
                                <div className='col-8 p-0'>    
                                    <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" onChange={(event)=>self.toggleUncertaintyLayer(event.target.checked)} />
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>);
        return element;
    }

    public toggleSelect(select: string){
        this.container.querySelector(".buttonDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".selectDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".buttonDiv." + select).classList.toggle("visible")
        this.container.querySelector(".selectDiv." + select).classList.toggle("visible")
    }

    public changePalette(value: string): void {
        let mgr=PaletteManager.getInstance();
        mgr.setSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    public changeBaseLayer(value:string):void{
        let mgr=LayerManager.getInstance();
        mgr.setBaseSelected(value);
        this.parent.update();
        // this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    public changeTopLayer(value:string):void{
        let mgr=LayerManager.getInstance();
        mgr.setTopSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    public toggleUncertaintyLayer (checked: boolean) {
        let ptMgr=PaletteManager.getInstance();
        ptMgr.setUncertaintyLayerChecked(checked)
        let uncertaintyText = document.querySelector("#uncertainty-text")
        uncertaintyText.innerHTML = this.parent.getTranslation('uncertainty') + ': ' + ptMgr.getUncertaintyLayerChecked() 
        let mgr=LayerManager.getInstance();
        mgr.showUncertaintyLayer(checked)
    }

    public renderUncertaintyFrame():JSX.Element {
        let mgr=PaletteManager.getInstance();
        // mgr.setUncertaintyLayerChecked(true) //  ------------ ORIGINAL - La capa de incertidumbre queda activa por defecto
        mgr.setUncertaintyLayerChecked(false)
        return (
            <div>
                <div className="buttonDiv uncDiv visible" onClick={()=>this.toggleSelect('uncDiv')}>
                    <span className="icon"><i className="bi bi-check-circle"></i></span>
                    <span className="text"  id='uncertainty-text' aria-label='uncertainty'>
                        {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyLayerChecked()}
                    </span>
                </div>
                <div className='row selectDiv uncDiv hidden'>
                    <div className='col-4 closeDiv p-0' onClick={()=>this.toggleSelect('uncDiv')}>
                        <span className="icon"><i className="bi bi-x"></i></span>
                    </div>
                    <div className='col-8 p-0'>    
                        {/* <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" onChange={(event)=>this.toggleUncertaintyLayer(event.target.checked)} checked /> */}
                        <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" onChange={(event)=>this.toggleUncertaintyLayer(event.target.checked)} />
                    </div>
                </div>
            </div>
        );
    }

    public build(){
        this.container = document.getElementById("PaletteFrame") as HTMLDivElement
        this.baseDiv = document.getElementById('base-div') as HTMLElement;
        this.dataDiv = document.getElementById('data-div') as HTMLElement;
        this.trpDiv = document.getElementById('trp-div') as HTMLElement;
        /* let select = this.container.querySelector("select");
        select.addEventListener('focusout',()=>this.hideSelect()) */
       /*  this.baseDiv.addEventListener('focusout',()=>this.hideSelect('baseDiv'))
        this.dataDiv.addEventListener('focusout',()=>this.hideSelect('dataDiv'))
        this.trpDiv.addEventListener('focusout',()=>this.hideSelect('trpDiv')) */

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
            this.dataDiv.hidden = true;
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
        let values= [...this.parent.getLegendValues()].reverse();
        let texts=[...this.parent.getLegendText()].reverse();
        let ptr=PaletteManager.getInstance().getPainter();
        let mgr=PaletteManager.getInstance();
        let lmgr=LayerManager.getInstance();
        let min = this.parent.getTimesJs().varMin[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let max = this.parent.getTimesJs().varMax[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let name:string; 
        let data=this.container.querySelector(".info")
        if (this.parent.getTimesJs().legendTitle[this.parent.getState().varId] != undefined){
            name = this.parent.getTimesJs().legendTitle[this.parent.getState().varId];
        }else {
            name = 'Unidades';
        }
        
        data.innerHTML="<div id='units'><span class='legendText'>"+name+"</span><br/></div>"
        values.map((val, index) =>{ 
            // let textSize = texts[index].length > 4? 'smallText':'mediumText'
            let textSize = 'smallText'
            addChild(data, (<div style={{background:ptr.getColorString(val,min,max),color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span className={`legendText ${textSize}`} > {texts[index]}</span><br/></div>));
            
            });
        data.innerHTML+="<div id='legendBottom'></div> "
        this.container.querySelector(".paletteSelect span[aria-label=base]").textContent= this.parent.getTranslation('base_layer') +": "+lmgr.getBaseSelected();
        this.container.querySelector(".paletteSelect span[aria-label=paleta]").textContent= this.parent.getTranslation('paleta') +": "+mgr.getSelected();
        this.container.querySelector(".paletteSelect span[aria-label=transparency]").textContent= this.parent.getTranslation('transparency') +": "+mgr.getTransparency();
        this.container.querySelector(".paletteSelect span[aria-label=top]").textContent= this.parent.getTranslation('top_layer') +": "+lmgr.getTopSelected();
        let uncertaintyLayer = this.parent.getState().uncertaintyLayer;
        
        this.uncertaintyFrame = this.container.querySelector("#unc-div")
        if (uncertaintyLayer) {
            this.uncertaintyFrame.hidden = false;
            if (this.uncertaintyFrame.children.length == 0) {
                addChild(this.uncertaintyFrame,this.renderUncertaintyFrame())
            }
        } else {
            this.uncertaintyFrame.hidden = true;
            if (this.uncertaintyFrame.children.length > 0) {
                while (this.uncertaintyFrame.firstChild) {
                    this.uncertaintyFrame.removeChild(this.uncertaintyFrame.firstChild);
                }
            }
        }
    }
}