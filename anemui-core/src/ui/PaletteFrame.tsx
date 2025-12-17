import { createElement, addChild } from 'tsx-create-element';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { GradientPainter, PaletteManager } from '../PaletteManager';
import Slider from 'bootstrap-slider';
import { LayerManager } from '../LayerManager';

export default class PaletteFrame extends BaseFrame {

    protected slider: Slider
    protected uncertaintySlider: Slider
    private uncertaintyFrame: HTMLElement;

    public render(): JSX.Element {
        let self = this;
        let values = this.parent.getLegendValues();
        let texts = this.parent.getLegendText();
        let mgr = PaletteManager.getInstance();
        let lmgr = LayerManager.getInstance();
        let ptr = mgr.getPainter();
        let min: number = Math.min(...values);
        let max: number = Math.max(...values);

        let name = this.parent.getState().legendTitle;
        let palettes = mgr.getPalettesNames();
        let uncertaintyLayer = this.parent.getState().uncertaintyLayer;
        mgr.setUncertaintyLayerChecked(false)
        
        // Pedimos a la app las paletas permitidas (si la app implementa la función)
        const allowedPalettes: string[] =
            (typeof (this.parent as any).getAllowedPalettes === 'function')
                ? (this.parent as any).getAllowedPalettes()
                : palettes.filter(p => p !== 'uncertainty'); // fallback: todas excepto uncertainty
         
         // Selección actual, y si es tipo continua según nuevos nombres
         const currentPalette = mgr.getSelected();
         const isContinuousPalette = ['continua_cv','continua_cambio','continua_prom'].includes(currentPalette);

        console.log('PaletteFrame.render:', { 
            palette: currentPalette, 
            valuesCount: values.length, 
            textsCount: texts.length,
            firstText: texts[0],
            lastText: texts[texts.length - 1]
        });

        // Consultar a la app qué paletas están permitidas y si debe mostrarse el selector
        const showPaletteSelector: boolean =
            (typeof (this.parent as any).isPaletteSelectorVisible === 'function')
                ? (this.parent as any).isPaletteSelectorVisible()
                : allowedPalettes.length > 1;

        let element = (
            <div id="PaletteFrame" className='rightbar-item paletteFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div className="info legend">
                    <div id="units"><span className='legendText'>{name}</span><br /></div>
                    {
                        isContinuousPalette ? (
                            <div className="gradient-legend-container">
                                <div 
                                    className="gradient-legend-bar" 
                                    style={{
                                        background: this.createGradientForPalette(mgr.getSelected(), mgr),
                                        height: `${Math.max(values.length * 40, 200)}px`,
                                        width: '100%',
                                        margin: '5px 0',
                                        border: '1px solid #ccc',
                                        borderRadius: '2px',
                                        minHeight: '150px'
                                    }}
                                ></div>
                            </div>
                        ) : (
                            values.map((val, index) => {
                                const backgroundColor = ptr.getColorString(val, min, max)
                                const textColor = this.isLightColor(backgroundColor) ? '#000' : '#fff';
                                return (<div key={index} style={{ background: backgroundColor, color: textColor }}><span className='legendText smallText'> {texts[index]}</span><br /></div>)
                            })
                        )
                    }
                    <div id="legendBottom"></div>
                </div>
                { showPaletteSelector &&
                    <div className='paletteSelect btnSelect right'>
                        <div id="palette-div">
                            <div className="buttonDiv paletteDiv visible" onClick={() => this.toggleSelect('paletteDiv')}>
                                <span className="icon"><i className="bi bi-palette"></i></span>
                                <span className="text" aria-label='paleta'>
                                    {this.parent.getTranslation('paleta')}: {mgr.getSelected()}
                                </span>
                            </div>
                            <div className='row selectDiv paletteDiv hidden'>
                                <div className='col closeDiv p-0' onClick={() => this.toggleSelect('paletteDiv')}>
                                    <span className="icon"><i className="bi bi-x"></i></span>
                                </div>
                                <div className='col-9 p-0 inputDiv'>
                                    <select className="form-select form-select-sm" aria-label="Change Palette" onChange={(event) => { self.changePalette(event.target.value) }}>
                                        {allowedPalettes.map((val, index) => {
                                            if (mgr.getSelected() == val) {
                                                return (<option key={index} value={val} selected>{val}</option>)
                                            }
                                            return (<option key={index} value={val}>{val}</option>)
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                }
                <div id="unc-div">
                    {uncertaintyLayer &&
                        <div className='paletteSelect btnSelect right'>
                            <div className="buttonDiv uncDiv visible" onClick={()=>this.toggleSelect('uncDiv')}>
                                <span className="icon"><i className="bi bi-question-circle"></i></span>
                                <span className="text" id='uncertainty-text' aria-label='uncertainty'>
                                    {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyOpacity()}%
                                </span>
                            </div>
                            <div className='row selectDiv uncDiv hidden'>
                                <div className='col closeDiv p-0' onClick={()=>this.toggleSelect('uncDiv')}>
                                    <span className="icon"><i className="bi bi-x"></i></span>
                                </div>
                                <div className='col-9 p-0 inputDiv d-flex justify-content-center'>
                                    <input className="selectDiv uncDiv" id="uncertaintySlider" data-slider-id='uncertaintySlider' type="text" data-slider-step="1" readOnly={true}/>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        );
        return element;
    }

    private createGradientForPalette(paletteName: string, mgr: PaletteManager): string {
        // Obtener colores desde PaletteManager (definidos por el servicio)
        const colors = mgr.updatePaletteStrings();
        if (colors && colors.length >= 2) {
            return this.generateSmoothGradient(colors);
        }
        return 'linear-gradient(to top, #ccc, #fff)';
    }

    private generateSmoothGradient(baseColors: string[]): string {
        if (baseColors.length < 2) {
            return 'linear-gradient(to top, #ccc, #fff)';
        }

        const interpolatedColors: string[] = [];
        const stepsPerSegment = 50; 

        for (let i = 0; i < baseColors.length - 1; i++) {
            const startColor = this.hexToRgb(baseColors[i]);
            const endColor = this.hexToRgb(baseColors[i + 1]);

            for (let step = 0; step <= stepsPerSegment; step++) {
                if (i === baseColors.length - 2 || step < stepsPerSegment) {
                    const ratio = step / stepsPerSegment;
                    const interpolatedColor = this.interpolateColor(startColor, endColor, ratio);
                    interpolatedColors.push(interpolatedColor);
                }
            }
        }
        const gradientStops = interpolatedColors.map((color, index) => {
            const percentage = (index / (interpolatedColors.length - 1)) * 100;
            return `${color} ${percentage.toFixed(1)}%`;
        }).join(', ');

        return `linear-gradient(to top, ${gradientStops})`;
    }

    private hexToRgb(hex: string): {r: number, g: number, b: number} {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }

    private interpolateColor(color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}, ratio: number): string {
        const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
        const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
        const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
        
        const toHex = (n: number) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    public toggleSelect(select: string) {
        this.container.querySelector(".buttonDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".selectDiv." + select).classList.toggle("hidden")
        this.container.querySelector(".buttonDiv." + select).classList.toggle("visible")
        this.container.querySelector(".selectDiv." + select).classList.toggle("visible")
    }

    public changePalette(value: string): void {
        let mgr = PaletteManager.getInstance();
        mgr.setSelected(value);
        this.parent.update();
        this.container.querySelector("div.paletteSelect").classList.remove("visible")
    }

    public changeUncertaintyOpacity(opacity: number): void {
        console.log('=== CHANGE UNCERTAINTY OPACITY ===');
        console.log('Opacity:', opacity);
        
        let ptMgr = PaletteManager.getInstance();
        ptMgr.setUncertaintyOpacity(opacity);
        
        // Actualizar el texto del botón
        let uncertaintyText = document.querySelector("#uncertainty-text");
        if (uncertaintyText) {
            uncertaintyText.innerHTML = this.parent.getTranslation('uncertainty') + ': ' + opacity + '%';
        }
        
        let lmgr = LayerManager.getInstance();
        
        if (lmgr.hasUncertaintyLayer()) {
            lmgr.setUncertaintyOpacity(opacity);
            console.log('Uncertainty opacity changed successfully');
        } else {
            console.warn('Uncertainty layer not available');
        }
    }

    public renderUncertaintyFrame(): JSX.Element {
        let mgr = PaletteManager.getInstance();
        return (
            <div className='paletteSelect btnSelect right'>
                {/* add data-key so tooltip observer can pick it */}
                <div className="buttonDiv uncDiv visible" data-key="uncertainty" onClick={() => this.toggleSelect('uncDiv')}>
                    <span className="icon"><i className="bi bi-question-circle"></i></span>
                    <span className="text" id='uncertainty-text' aria-label='uncertainty'>
                        {this.parent.getTranslation('uncertainty')}: {mgr.getUncertaintyOpacity()}%
                    </span>
                </div>
                <div className='row selectDiv uncDiv hidden'>
                    <div className='col closeDiv p-0' onClick={() => this.toggleSelect('uncDiv')}>
                        <span className="icon"><i className="bi bi-x"></i></span>
                    </div>
                    <div className='col-9 p-0 inputDiv d-flex justify-content-center'>
                        <input className="selectDiv uncDiv" id="uncertaintySlider" data-slider-id='uncertaintySlider' type="text" data-slider-step="1" readOnly={true}/>
                    </div>
                </div>
            </div>
        );
    }

/**
 * Inicializa el slider de uncertainty
 */
private initializeUncertaintySlider(initialValue: number): void {
    const uncertaintySliderElement = document.getElementById("uncertaintySlider");
    
    if (!uncertaintySliderElement) {
        console.warn('uncertaintySlider element not found in DOM');
        return;
    }

    try {
        // Configurar el elemento como readonly ANTES de crear el slider
        const inputEl = uncertaintySliderElement as HTMLInputElement;
        inputEl.readOnly = true;
        inputEl.setAttribute('readonly', 'readonly');
        inputEl.setAttribute('data-provide', 'slider');
        
        // Prevenir escritura
        const preventInput = (ev: Event) => { 
            ev.preventDefault(); 
            ev.stopPropagation();
            return false;
        };
        inputEl.addEventListener('keydown', preventInput as EventListener);
        inputEl.addEventListener('keypress', preventInput as EventListener);
        inputEl.addEventListener('keyup', preventInput as EventListener);
        inputEl.addEventListener('paste', preventInput as EventListener);
        inputEl.addEventListener('drop', preventInput as EventListener);
        inputEl.addEventListener('input', preventInput as EventListener);
        
        // Si ya existe un slider, destruirlo primero
        if (this.uncertaintySlider) {
            try {
                this.uncertaintySlider.destroy();
                this.uncertaintySlider = null;
            } catch (e) {
                console.warn('Error destroying old slider:', e);
                this.uncertaintySlider = null;
            }
        }

        // Crear el slider
        this.uncertaintySlider = new Slider(uncertaintySliderElement, {
            natural_arrow_keys: true,
            min: 0,
            max: 100,
            value: initialValue,
            tooltip: 'hide'
        });

        // Prevenir focus en el input
        inputEl.addEventListener('focus', (ev) => {
            ev.preventDefault();
            inputEl.blur();
        });

        this.uncertaintySlider.on('slideStop', (val: number) => {
            this.changeUncertaintyOpacity(val);
        });

        console.log('Uncertainty slider initialized with value:', initialValue);
    } catch (err) {
        console.error('Error initializing uncertainty slider:', err);
    }
}

/**
 * Verifica que el slider esté correctamente inicializado
 */
private ensureUncertaintySliderInitialized(currentValue: number): void {
    const uncertaintySliderElement = document.getElementById("uncertaintySlider");
    
    if (!uncertaintySliderElement) {
        console.warn('uncertaintySlider element not found');
        return;
    }
    
    // Verificar si el slider existe y está funcionando
    if (!this.uncertaintySlider) {
        console.log('Uncertainty slider not initialized, creating it...');
        this.initializeUncertaintySlider(currentValue);
    } else {
        // El slider existe, actualizar su valor
        try {
            this.uncertaintySlider.setValue(currentValue);
            console.log('Updated uncertainty slider value to:', currentValue);
        } catch (error) {
            // Si falla, significa que el slider se destruyó, recrearlo
            console.warn('Uncertainty slider broken, reinitializing...', error);
            this.uncertaintySlider = null;
            this.initializeUncertaintySlider(currentValue);
        }
    }
}

public async update(): Promise<void> {
    const legendValues = await this.parent.getLegendValues();
    const legendText = await this.parent.getLegendText();

    if (!legendValues || !legendText) {
        console.warn('Legend values or text are undefined, skipping palette update');
        return;
    }

    if (!this.container) {
        console.warn('PaletteFrame container not initialized, skipping palette update');
        return;
    }

    // Asegurar visibilidad del selector de paleta según la app
    try {
        const mgrForVisibility = PaletteManager.getInstance();
        const allowedPalettes: string[] =
            (typeof (this.parent as any).getAllowedPalettes === 'function')
                ? (this.parent as any).getAllowedPalettes()
                : mgrForVisibility.getPalettesNames().filter(p => p !== 'uncertainty');

        const showPaletteSelector: boolean =
            (typeof (this.parent as any).isPaletteSelectorVisible === 'function')
                ? (this.parent as any).isPaletteSelectorVisible()
                : allowedPalettes.length > 1;

        const paletteSelectorEls = Array.from(this.container.querySelectorAll('.paletteSelect'))
            .filter((el: Element) => el.querySelector('#palette-div') !== null) as HTMLElement[];
        paletteSelectorEls.forEach(el => {
            el.style.display = showPaletteSelector ? '' : 'none';
        });
    } catch (e) {
        console.warn('Error checking palette selector visibility:', e);
    }

    let values = [...legendValues].reverse();
    let texts = [...legendText].reverse();
    let ptr = PaletteManager.getInstance().getPainter();
    let mgr = PaletteManager.getInstance();
    let lmgr = LayerManager.getInstance();
    let min: number = Math.min(...values);
    let max: number = Math.max(...values);
    let name: string;
    let data = this.container.querySelector(".info")

    if (this.parent.getState().computedLayer) {
        name = this.parent.getState().legendTitle;
    } else {
        if (this.parent.getTimesJs().legendTitle[this.parent.getState().varId] != undefined) {
            name = this.parent.getTimesJs().legendTitle[this.parent.getState().varId];
        } else {
            name = this.parent.getState().legendTitle;
        }
    }

    data.innerHTML = "<div id='units'><span class='legendText'>" + name + "</span><br/></div>";

    const currentPalette = mgr.getSelected();
    const isContinuousPalette = ['continua_cv', 'continua_cambio', 'continua_prom'].includes(currentPalette);
    const isWindPalette = currentPalette === 'wind-kmh';
    
    console.log('PaletteFrame.update:', { 
        currentPalette, 
        isWindPalette, 
        valuesLength: values.length, 
        textsLength: texts.length,
        firstText: texts[0],
        lastText: texts[texts.length - 1]
    });

    if (isContinuousPalette) {
        const gradientDiv = document.createElement('div');
        gradientDiv.className = 'gradient-legend-container';
        const bg = this.createGradientForPalette(currentPalette, mgr);
        gradientDiv.innerHTML = `
            <div class="gradient-legend-bar" style="
                background: ${bg};
                height: ${Math.max(values.length * 40, 200)}px;
                width: 100%;
                border: 1px solid #ccc;
                border-radius: 2px;
                min-height: 150px;
            "></div>
        `;
        data.appendChild(gradientDiv);
    } else if (isWindPalette) {
        console.log('Rendering wind palette legend in update');
        
        const windColors = mgr.updatePaletteStrings();
        console.log('Wind colors for legend:', windColors);
        
        texts.forEach((text, index) => {
            const colorIndex = windColors.length - 1 - index;
            const backgroundColor = windColors[colorIndex];
            const textColor = this.isLightColor(backgroundColor) ? '#000' : '#fff';
            
            const legendItem = document.createElement('div');
            legendItem.style.background = backgroundColor;
            legendItem.style.color = textColor;
            legendItem.innerHTML = `<span class="legendText smallText"> ${text}</span><br/>`;
            
            data.appendChild(legendItem);
            
            console.log(`Wind legend item ${index}:`, { text, color: backgroundColor, colorIndex });
        });
    } else {
        values.map((val: number, index: number) => {
            let mgr = PaletteManager.getInstance();
            mgr.updatePaletteStrings(); 
            let ptr = mgr.getPainter();
            const backgroundColor = ptr.getColorString(val, min, max);
            const textColor = this.isLightColor(backgroundColor) ? '#000' : '#fff';

            let displayText = texts[index];

            addChild(data, (
                <div style={{ background: backgroundColor, color: textColor }}>
                    <span className="legendText smallText">{displayText}</span><br />
                </div>
            ));
        });
    }

    data.innerHTML += "<div id='legendBottom'></div>";

    let uncertaintyLayer = this.parent.getState().uncertaintyLayer;

this.uncertaintyFrame = this.container.querySelector("#unc-div");
if (uncertaintyLayer && this.uncertaintyFrame) {
    this.uncertaintyFrame.hidden = false;
    
    const existingUncertaintyDiv = this.uncertaintyFrame.querySelector('.paletteSelect');
    
    if (!existingUncertaintyDiv) {
        // Primera vez: crear el frame
        addChild(this.uncertaintyFrame, this.renderUncertaintyFrame());
        
        // Esperar a que el DOM esté listo
        setTimeout(() => {
            const sliderEl = document.getElementById("uncertaintySlider");
            if (sliderEl) {
                this.initializeUncertaintySlider(mgr.getUncertaintyOpacity());
            } else {
                console.warn('uncertaintySlider element not found after render');
            }
        }, 150);
    } else {
        // Ya existe: actualizar texto y verificar slider
        const uncertaintyText = this.uncertaintyFrame.querySelector("#uncertainty-text");
        if (uncertaintyText) {
            uncertaintyText.textContent = this.parent.getTranslation('uncertainty') + ': ' + mgr.getUncertaintyOpacity() + '%';
        }
        
        // Verificar si el slider existe y reinicializarlo si es necesario
        setTimeout(() => {
            this.ensureUncertaintySliderInitialized(mgr.getUncertaintyOpacity());
        }, 50);
    }
} else if (this.uncertaintyFrame) {
    this.uncertaintyFrame.hidden = true;
    // Destruir el slider si existe
    this.destroyUncertaintySlider();
    // Limpiar el DOM
    if (this.uncertaintyFrame.children.length > 0) {
        while (this.uncertaintyFrame.firstChild) {
            this.uncertaintyFrame.removeChild(this.uncertaintyFrame.firstChild);
        }
    }
}
}

    /**
     * Destruye el slider de uncertainty
     */
    private destroyUncertaintySlider(): void {
        if (this.uncertaintySlider) {
            try {
                this.uncertaintySlider.destroy();
                this.uncertaintySlider = null;
                console.log('Uncertainty slider destroyed');
            } catch (error) {
                console.warn('Error destroying uncertainty slider:', error);
                this.uncertaintySlider = null;
            }
        }
    }

    public build() {
        this.container = document.getElementById("PaletteFrame") as HTMLDivElement
        
        // El slider de uncertainty se inicializa en update() cuando sea necesario
    }

    public minimize(): void {
        this.container.classList.add("paletteSmall")
    }

    public showFrame(): void {
        this.container.classList.remove("paletteSmall")
    }

    private createDataDrivenGradient(values: number[], min: number, max: number, ptr: any): string {
        const stops = values.map((val, idx) => {
            const color = ptr.getColorString(val, min, max);
            const pct = (idx / (values.length - 1)) * 100;
            return `${color} ${pct}%`;
        });
        return `linear-gradient(to top, ${stops.join(", ")})`;
    }

    private isLightColor(hexColor: string): boolean {
        if (hexColor == undefined) return false;
        const hex = hexColor.replace('#', '');
        
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5;
    }
}