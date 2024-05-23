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
        let element=
        (<div id="PaletteFrame" className='paletteFrame' onMouseOver={(event:React.MouseEvent)=>{mouseOverFrame(self,event)}}>
            <div className="info legend">
                <div id="units"><span>{name}</span><br/></div>
                {values.map((val, index) => (
                    <div style={{background:ptr.getColorString(val,min,max), color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span> {texts[index]}</span><br/></div>
                 ))}
            </div>
            <div className='paletteSelect' onMouseEnter={()=>this.showSelect()} onMouseLeave={()=>this.hideSelect()}  >
                <div id="base-div">
                    <span aria-label='base'>
                        {this.parent.getTranslation('base_layer')}: Arqgis
                    </span>
                    <select className="form-select form-select-sm" aria-label="Change Base" onChange={(event)=>self.changeBaseLayer(event.target.value)}
                    >
                        {baseLayers.map((val,index)=>{
                            if(lmgr.getBaseSelected()==val){
                                return (<option value={val} selected>{val}</option>)
                            }
                        return (<option value={val}>{val}</option>)
                        })}
                    </select>
                </div>
                <span aria-label='paleta'>
                    {this.parent.getTranslation('paleta')}:{mgr.getSelected()}
                </span>
                {/* <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>self.changePalette(event)}   */}
                <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event)=>self.changePalette(event.target.value)}
                 >
                    {palettes.map((val,index)=>{
                        if(mgr.getSelected()==val){
                            return (<option value={val} selected>{val}</option>)
                        }
                       return (<option value={val}>{val}</option>)
                    })}
                </select>
                <div id="trp-div">
                    <span aria-label='transparency'>
                        {this.parent.getTranslation('transparency')}:{mgr.getTransparency()}
                    </span>
                    <input id="transparencySlider" data-slider-id='ex2Slider' type="text" data-slider-step="1"/>
                </div>
                <div id="data-div">
                    <span aria-label='top'>
                        {this.parent.getTranslation('top_layer')}:Politico
                    </span>
                    <select className="form-select form-select-sm" aria-label="Change Base" onChange={(event)=>self.changeTopLayer(event.target.value)}
                    >
                        {topLayers.map((val,index)=>{
                            if(lmgr.getTopSelected()==val){
                                return (<option value={val} selected>{val}</option>)
                            }
                        return (<option value={val}>{val}</option>)
                        })}
                    </select>
                </div>
            </div>
        </div>);
        // console.log("Palete selected on render= "+mgr.getSelected() )
        return element;
    }

    public showSelect(){
        this.container.querySelector("div.paletteSelect").classList.add("visible")
    }
    public hideSelect(){
        let select = this.container.querySelector("select");
        if(select != document.activeElement)
            this.container.querySelector("div.paletteSelect").classList.remove("visible")
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
            addChild(data, (<div style={{background:ptr.getColorString(val,min,max),color:ptr.getColorString(val,min,max)>='#CCCCCC'?'#000':'#fff'}}><span> {texts[index]}</span><br/></div>));
            
            });
        this.container.querySelector(".paletteSelect span[aria-label=base]").textContent= this.parent.getTranslation('base_layer') +": "+lmgr.getBaseSelected();
        this.container.querySelector(".paletteSelect span[aria-label=paleta]").textContent= this.parent.getTranslation('paleta') +": "+mgr.getSelected();
        this.container.querySelector(".paletteSelect span[aria-label=transparency]").textContent= this.parent.getTranslation('transparency') +": "+mgr.getTransparency();
        this.container.querySelector(".paletteSelect span[aria-label=top]").textContent= this.parent.getTranslation('top_layer') +": "+lmgr.getTopSelected();
    }
}


