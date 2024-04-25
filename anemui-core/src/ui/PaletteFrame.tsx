import { createElement, addChild } from 'tsx-create-element';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { PaletteManager } from '../PaletteManager';
import { ChangeEvent } from 'react';

export default class PaletteFrame  extends BaseFrame{

    public render():JSX.Element{
        let self=this;
        let values= [...this.parent.getLegendValues()].reverse();
        let texts=[...this.parent.getLegendText()].reverse();
        let mgr=PaletteManager.getInstance();
        let ptr=mgr.getPainter();
        let min = this.parent.getTimesJs().varMin[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let max = this.parent.getTimesJs().varMax[this.parent.getState().varId][this.parent.getState().selectedTimeIndex];
        let name = this.parent.getState().legendTitle;
        let palettes=mgr.getPalettesNames();
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
                <span>
                    {this.parent.getTranslation('paleta')}: {mgr.getSelected()}
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

    public build(){
        this.container=document.getElementById("PaletteFrame") as HTMLDivElement
        let select = this.container.querySelector("select");
        select.addEventListener('focusout',()=>this.hideSelect())
            
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
        this.container.querySelector(".paletteSelect span").textContent= this.parent.getTranslation('paleta') +": "+mgr.getSelected();
    }
}

