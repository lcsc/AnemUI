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
        mgr.setUncertaintyLayerChecked(true)
        let element=
        (<div id="PaletteFrame" className='paletteFrame' onMouseOver={(event:React.MouseEvent)=>{mouseOverFrame(self,event)}}>
            <div className="info legend">
                <div id="units"><span>{name}</span><br/></div>
                {values.map((val, index) => (
                    <div className='legendText smallText' style={{background:ptr.getColorString(val,min,max), color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span> {texts[index]}</span><br/></div>
                 ))}
                <div id="legendBottom"></div> 
            </div>
            <div className='paletteSelect' onMouseEnter={()=>this.showSelect()} onMouseLeave={()=>this.hideSelect()}  >
                <div id="base-div" className="selectDiv">
                    <span aria-label='base'>
                        {this.parent.getTranslation('base_layer')}: Arqgis
                    </span>
                    <select className="form-select form-select-sm palette-select" aria-label="Change Base" onChange={(event)=>self.changeBaseLayer(event.target.value)}>
                        {baseLayers.map((val,index)=>{
                            if(lmgr.getBaseSelected()==val){
                                return (<option value={val} selected>{val}</option>)
                            }
                        return (<option value={val}>{val}</option>)
                        })}
                    </select>
                </div>
                <div id="palette-div" className="selectDiv">
                    <span aria-label='paleta'>
                        {this.parent.getTranslation('paleta')}: {mgr.getSelected()}
                    </span>
                    {/* <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>self.changePalette(event)}   */}
                    <select className="form-select form-select-sm palette-select" aria-label="Change Palette" onChange={(event)=>self.changePalette(event.target.value)}
                    >
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
                {/* <span aria-label='paleta'>
                    {this.parent.getTranslation('paleta')}:{mgr.getSelected()}
                </span> */}
                {/* <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>self.changePalette(event)}   */}
                {/* <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>self.changePalette(event.target.value)}
                 >
                    {palettes.map((val,index)=>{
                        if(mgr.getSelected()==val){
                            return (<option value={val} selected>{val}</option>)
                        }
                       return (<option value={val}>{val}</option>)
                    })}
                </select> */}
                <div id="trp-div" className="selectDiv">
                    <span aria-label='transparency'>
                        {this.parent.getTranslation('transparency')}: {mgr.getTransparency()}
                    </span>
                    <input id="transparencySlider" data-slider-id='ex2Slider' type="text" data-slider-step="1"/>
                </div>
                <div id="data-div" className="selectDiv">
                    <span aria-label='top'>
                        {this.parent.getTranslation('top_layer')}: Politico
                    </span>
                    <select className="form-select form-select-sm palette-select" aria-label="Change Base" onChange={(event)=>self.changeTopLayer(event.target.value)}
                    >
                        {topLayers.map((val,index)=>{
                            if(lmgr.getTopSelected()==val){
                                return (<option value={val} selected>{val}</option>)
                            }
                        return (<option value={val}>{val}</option>)
                        })}
                    </select>
                </div>
                <div id="uncertainty-frame" className="selectDiv" hidden>
                    {uncertaintyLayer &&
                        <div className="form-check form-switch">
                            <span id='uncertainty-text' aria-label='uncertainty'>
                                {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyLayerChecked()}
                            </span>
                            <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" onChange={(event)=>self.toggleuncertaintyLayer(event.target.checked)} checked />
                        </div>
                    }
                </div>
            </div>
        </div>);
                return element;
    }

    public showSelect(){
// this.container.querySelector("div.paletteSpan").classList.remove("visible")
        this.container.querySelector("div.paletteSelect").classList.add("visible")
    }

    public hideSelect(){
        let select = this.container.querySelector("select");
        if(select != document.activeElement)
            this.container.querySelector("div.paletteSelect").classList.remove("visible")
// this.container.querySelector("div.paletteSpan").classList.add("visible")
    }

    // changePalette(event: ChangeEvent<HTMLSelectElement>): void {
    //     let mgr=PaletteManager.getInstance();
    //     mgr.setSelected(event.target.value);
    //     this.parent.update();
    //     this.container.querySelector("div.paletteSelect").classList.remove("visible")
    // }

    changePalette(value: string): void {
        let mgr=PaletteManager.getInstance();
        mgr.setSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    changeBaseLayer(value:string):void{
        let mgr=LayerManager.getInstance();
        mgr.setBaseSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    changeTopLayer(value:string):void{
        let mgr=LayerManager.getInstance();
        mgr.setTopSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    toggleuncertaintyLayer (checked: boolean) {
        let ptMgr=PaletteManager.getInstance();
        ptMgr.setUncertaintyLayerChecked(checked)
        let uncertaintyText = document.querySelector("#uncertainty-text")
        uncertaintyText.innerHTML = this.parent.getTranslation('uncertainty') + ': ' + ptMgr.getUncertaintyLayerChecked() 
        let mgr=LayerManager.getInstance();
        mgr.showuncertaintyLayer(checked)
    }

    public renderuncertaintyFrame():JSX.Element {
        let mgr=PaletteManager.getInstance();
        mgr.setUncertaintyLayerChecked(true)
        return (
            <div className="form-check form-switch">
                <span id='uncertainty-text' aria-label='uncertainty'>
                    {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyLayerChecked()} 
                </span>
                <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" onChange={(event)=>this.toggleuncertaintyLayer(event.target.checked)} checked/>
            </div>
        );
    }

    public build(){
        this.container=document.getElementById("PaletteFrame") as HTMLDivElement
        this.baseDiv = document.getElementById('base-div') as HTMLElement;
        this.dataDiv = document.getElementById('data-div') as HTMLElement;
        this.trpDiv = document.getElementById('trp-div') as HTMLElement;
        let select = this.container.querySelector("select");
        select.addEventListener('focusout',()=>this.hideSelect())

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
        
        data.innerHTML="<div id='units'><span>"+name+"</span><br/></div>"
        values.map((val, index) =>{ 
            // let textSize = texts[index].length > 4? 'smallText':'mediumText'
            let textSize = 'smallText'
            addChild(data, (<div className={`legendText ${textSize}`}  style={{background:ptr.getColorString(val,min,max),color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span> {texts[index]}</span><br/></div>));
            
            });
        data.innerHTML+="<div id='legendBottom'></div> "
        this.container.querySelector(".paletteSelect span[aria-label=base]").textContent= this.parent.getTranslation('base_layer') +": "+lmgr.getBaseSelected();
        this.container.querySelector(".paletteSelect span[aria-label=paleta]").textContent= this.parent.getTranslation('paleta') +": "+mgr.getSelected();
        this.container.querySelector(".paletteSelect span[aria-label=transparency]").textContent= this.parent.getTranslation('transparency') +": "+mgr.getTransparency();
        this.container.querySelector(".paletteSelect span[aria-label=top]").textContent= this.parent.getTranslation('top_layer') +": "+lmgr.getTopSelected();
        let uncertaintyLayer = this.parent.getState().uncertaintyLayer;
        
        this.uncertaintyFrame = this.container.querySelector("#uncertainty-frame")
        if (uncertaintyLayer) {
            this.uncertaintyFrame.hidden = false;
            if (this.uncertaintyFrame.children.length == 0) {
                addChild(this.uncertaintyFrame,this.renderuncertaintyFrame())
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