import { createElement, addChild } from 'tsx-create-element';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { GradientPainter, PaletteManager } from '../PaletteManager';
import Slider from 'bootstrap-slider';
import { LayerManager } from '../LayerManager';

export default class PaletteFrame  extends BaseFrame{

    protected slider: Slider

    public render():JSX.Element{
        let self=this;
        let values= [...this.parent.getLegendValues()].reverse();
        let texts=[...this.parent.getLegendText()].reverse();
        let mgr=PaletteManager.getInstance();
        let lmgr = LayerManager.getInstance();
        let ptr=mgr.getPainter();
        let min: number =  Math.min(...values);
        let max: number =  Math.max(...values);

        let name = this.parent.getState().legendTitle;
        let palettes=mgr.getPalettesNames();
        mgr.setUncertaintyLayerChecked(false)
        let element=
        (<div id="PaletteFrame" className='rightbar-item paletteFrame' onMouseOver={(event:React.MouseEvent)=>{mouseOverFrame(self,event)}}>
            <div className="info legend">
                <div id="units"><span className='legendText'>{name}</span><br/></div>
                { 
                    values.map((val, index) =>  {
                        const backgroundColor = ptr.getColorString(val, min, max)
                        if (ptr instanceof GradientPainter){
                            return (<div style={{background:backgroundColor, height: '1px'}} data-toggle="tooltip" data-placement="left" title={texts[index]}></div>
                        )} else {
                            const textColor = this.isLightColor(backgroundColor) ? '#000' : '#fff';
                            return (<div style={{background:backgroundColor, color:textColor}}><span className='legendText smallText'> {texts[index]}</span><br/></div>)
                        }
                    })
                }
                <div id="legendBottom"></div> 
            </div>
            { palettes.length > 2 &&  
                <div className='paletteSelect btnSelect right'>
                    <div id="palette-div">
                        <div className="buttonDiv paletteDiv visible"  onClick={()=>this.toggleSelect('paletteDiv')}>
                            <span className="icon"><i className="bi bi-palette"></i></span>
                            <span className="text" aria-label='paleta'>
                                {this.parent.getTranslation('paleta')}: {mgr.getSelected()}
                            </span>
                        </div>
                        <div className='row selectDiv paletteDiv hidden'>
                            <div className='col closeDiv p-0' onClick={()=>this.toggleSelect('paletteDiv')}>
                                <span className="icon"><i className="bi bi-x"></i></span>
                            </div>
                            <div className='col-9 p-0 inputDiv'>
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
                </div>
            }
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

    public build(){
        this.container = document.getElementById("PaletteFrame") as HTMLDivElement
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
        let min: number =  Math.min(...values);
        let max: number =  Math.max(...values);
        let name:string; 
        let data=this.container.querySelector(".info")
        
        if (this.parent.getTimesJs().legendTitle[this.parent.getState().varId] != undefined){
            name = this.parent.getTimesJs().legendTitle[this.parent.getState().varId];
        }else {
            name = this.parent.getState().legendTitle;
        }
        
        data.innerHTML = "<div id='units'><span class='legendText'>" + name + "</span><br/></div>";

        values.map((val, index) => { 
            const backgroundColor = ptr.getColorString(val, min, max);
            
            if (ptr instanceof GradientPainter) {
                addChild(data, (<div style={{
                    background: backgroundColor, 
                    height: '1px'
                }} data-toggle="tooltip" data-placement="left" title={texts[index]}></div>));
            } else {
                // Determinar el color del texto basado en el fondo
                const textColor = this.isLightColor(backgroundColor) ? '#000' : '#fff';
                
                addChild(data, (<div style={{
                    background: backgroundColor,
                    color: textColor
                }}>
                    <span className={`legendText smallText`}>{texts[index]}</span><br/>
                </div>));
            }
        });

        data.innerHTML += "<div id='legendBottom'></div>";

        let palettes=mgr.getPalettesNames();
        if (palettes.length > 2) this.container.querySelector(".paletteSelect span[aria-label=paleta]").textContent= this.parent.getTranslation('paleta') +": "+mgr.getSelected();
    }

    // Función para determinar si un color es claro u oscuro
    private isLightColor(hexColor: string): boolean {

        if (hexColor == undefined) return false;
        // Remover el # si existe
        const hex = hexColor.replace('#', '');
        
        // Convertir hex a RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calcular la luminancia usando la fórmula estándar
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Si la luminancia es mayor a 0.5, es un color claro
        return luminance > 0.5;
    }
}