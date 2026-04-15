import { createElement } from "tsx-create-element";
import { BaseApp } from "../BaseApp";
import { BaseFrame } from "./BaseFrame";
import Dygraph, { dygraphs } from 'dygraphs';
import { dateText } from "../data/CsPConstans";
import { CsTimeSpan } from "../data/CsDataTypes";
import { CsLatLong } from '../CsMapTypes';

require("dygraphs/dist/dygraph.css")

export type GraphType = "Serial" | "Area" | "Linear" | "Cummulative" | "MgFr" | "WindRose" | "PercentileClock" | "ECDF" | "DailyEvolution"

interface MeanLineConfig {
  show: boolean;
  color: string;
  lineWidth: number;
  dashPattern: number[];
  showLabel: boolean;
  labelText: string;
  shadowColor: string;
  shadowBlur: number;
  labelBackgroundColor: string;
  labelTextColor: string;
  labelBorderRadius: number;
  labelPadding: number;
}

export interface ColorLegendRange {
  min: number;
  max: number;
  color: string;
  label: string;
}

export interface ColorLegendConfig {
  title: string;
  ranges: ColorLegendRange[];
}


export class CsGraph extends BaseFrame {
  protected graphTitle: string;
  protected graphSubTitle: string;
  protected yLabel: string;
  protected xLabel: string;
  public graphType: GraphType;
  public byPoint: boolean;
  public scaleSelectors: boolean = false;
  public stationProps: any = []

  private downloadButtonContainer: HTMLButtonElement;
  private featureButtonContainer: HTMLButtonElement;

  // Paginación para StackedBar
  private currentYear: number = 0;
  private totalYears: number = 0;
  private fullData: string = "";
  private currentGraph: Dygraph | null = null;

  // Tipo de ola (calor o frío)
  public waveType: string = "heat"; // "heat" o "cold"

  // Contador para climatología
  protected climatologyIndex: number = 0;

  // Propiedades para manejo de escalas logarítmicas
  protected originalGraphData: string | null = null;
  protected currentXLogScale: boolean = false;
  protected currentYLogScale: boolean = false;
  protected customPointData: {x: number, y: number} | null = null;

  // Year labels for band legends
  private firstYearLabel: string = 'firstYear';
  private lastYearLabel: string = 'lastYear';
  private meanLineConfig = {
    show: true,
    color: '#FF4444',
    lineWidth: 2,
    dashPattern: [8, 4],
    showLabel: true,
    labelText: 'Media'
  };

  protected currentMeanValue: number = 0;
  private eventDataCSV: string = ''; // CSV data for event-based visualization
  private drawnPoints: Array<{cx: number, cy: number, radius: number, row: number, dygraph: any}> = []; // Store drawn point positions

  // Configuración para etiquetas de punto personalizado
  protected pointYLabel: string = 'Valor'; // Etiqueta para eje Y (ej: "Temperatura", "Precipitación")
  protected pointYUnit: string = ''; // Unidad para eje Y (ej: "°C", "mm/día")
  protected pointXLabel: string = 'Período'; // Etiqueta para eje X
  protected pointXUnit: string = 'años'; // Unidad para eje X

  public constructor(_parent: BaseApp) {
    super(_parent)
  }

  // Stub methods for ETM-specific UI controls (overridden in ETMGraph)
  protected changeViewMode(): void {}
  protected toggleTemperatureType(): void {}
  protected previousYear(): void {}
  protected nextYear(): void {}
  protected createCompleteYearData(dataLines: string[], targetYear: number, header: string): string {
    // Stub implementation - overridden in ETMGraph
    return header + '\n';
  }
  protected updateGraphForYear(): void {
    // Stub implementation - overridden in ETMGraph
  }

  public render(): JSX.Element {
    let self = this;
    // Calcular tamaño responsivo del gráfico
    const maxWidth = Math.min(screen.width * 0.85, 900);
    const maxHeight = Math.min(screen.height * 0.65, 500);
    let graphWidth = screen.width > 1200 ? Math.min(screen.width * 0.4, maxWidth) : Math.min(screen.width * 0.55, maxWidth);
    let graphHeight = screen.height > 900 ? Math.min(screen.height * 0.4, maxHeight) : Math.min(screen.height * 0.50, maxHeight);
    let element =
      (<div className="container">
        <div id="GraphContainer" className='GraphContainer row' hidden >
          <div className="popup-content-wrapper col">
            <div className="popup-content" style={{ width: "auto", position: "relative" }}>
              <div id="popGraph" style={{ height: graphHeight + "px", width: graphWidth + "px" }}></div>
              <div id="graphTooltip"></div>
            </div>
            <div className="labels-content" style={{ width: "auto" }}>
              <div id="labels" style={{ width: "100%", maxWidth: graphWidth + "px" }}></div>
            </div>
            <div id="colorLegend" style={{ display: "none", padding: "8px 5px", justifyContent: "center", alignItems: "center", gap: "3px", flexWrap: "wrap", fontSize: "11px" }}></div>
            <div id="graphControls" className="graph-controls" hidden style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "10px", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label htmlFor="viewModeSelector" style={{ fontWeight: "bold" }}>Vista:</label>
                <select id="viewModeSelector" className="form-select" style={{ width: "auto" }} onChange={() => { this.changeViewMode() }}>
                  <option value="monthly">Por años</option>
                  <option value="full">Serie completa</option>
                </select>
              </div>
              <div id="tempToggleContainer" style={{ display: "none", alignItems: "center", gap: "10px" }}>
                <label htmlFor="tempToggle" style={{ fontWeight: "bold" }}>Mostrar:</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label htmlFor="tempToggle" style={{ fontWeight: "normal", marginBottom: 0 }}>Temperatura media</label>
                  <label className="switch">
                    <input type="checkbox" id="tempToggle" onChange={() => { this.toggleTemperatureType() }} />
                    <span className="slider round"></span>
                  </label>
                  <label htmlFor="tempToggle" style={{ fontWeight: "normal", marginBottom: 0 }}>Temperatura extrema</label>
                </div>
              </div>
              <div id="yearPagination" className="year-pagination" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <button type="button" id="prevYearBtn" className="btn navbar-btn" onClick={() => { this.previousYear() }}>← Año anterior</button>
                <span id="currentYearLabel" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Año: </span>
                <button type="button" id="nextYearBtn" className="btn navbar-btn" onClick={() => { this.nextYear() }}>Año siguiente →</button>
              </div>
            </div>
            <div id="graphDiv" className="droppDownButton" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <button type="button" role="dropPointBtn" className="btn navbar-btn" onClick={() => { this.parent.downloadPoint() }}>{this.parent.getTranslation('descargar_pixel')}</button>
                <button type="button" role="dropFeatureBtn" className="btn navbar-btn" hidden onClick={() => { this.parent.downloadFeature(this.stationProps) }}>{this.parent.getTranslation('descargar_pixel')}</button>
              </div>
              <div>
                <button type="button" className="btn navbar-btn" onClick={() => { this.exportGraph() }}><i className="bi bi-printer"></i> {this.parent.getTranslation('imprimir_grafico') || 'Imprimir gráfico'}</button>
              </div>
            </div>
          </div>
          <div className="col">
            <a className="popup-close-button" onClick={() => { this.closeGraph() }}>
              <i className="bi bi-x-circle-fill"></i>
            </a>
          </div>
        </div>
      </div>);
    return element;
  }

  public build(): void {
    this.container = document.getElementById("GraphContainer") as HTMLDivElement
    this.downloadButtonContainer = this.container.querySelector("[role=dropPointBtn]");
    this.featureButtonContainer = this.container.querySelector("[role=dropFeatureBtn]");

    // Añadir funcionalidad de arrastrar
    this.initDraggable();
  }

  /**
   * Inicializa la funcionalidad de arrastrar el contenedor del gráfico
   */
  private initDraggable(): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    let pendingDrag = false;
    const DRAG_THRESHOLD = 5;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' || target.tagName === 'A') {
        return;
      }

      pendingDrag = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!pendingDrag && !isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (!isDragging) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) return;
        isDragging = true;
        this.container.style.transform = 'none';
        this.container.style.left = startLeft + 'px';
        this.container.style.top = startTop + 'px';
      }

      this.container.style.left = (startLeft + deltaX) + 'px';
      this.container.style.top = (startTop + deltaY) + 'px';
      e.preventDefault();
    };

    const onMouseUp = () => {
      isDragging = false;
      pendingDrag = false;
    };

    this.container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  public setParams(_title: string = '', _type: GraphType, _byPoint: boolean, _scaleSelectors?: boolean, _xLabel: string = '', _yLabel: string = '') {
    this.graphType = _type;
    if (_title != '') this.graphTitle = _title;
    else  {
      switch (this.graphType) {
        case "Serial":
        case "Area":
          this.graphTitle = this.parent.getTranslation('serie_temporal');
          break;
        case "Cummulative":
          this.graphTitle = this.parent.getTranslation('modelo_lineal');
          break;
        case "Linear":
        case "MgFr":
          this.graphTitle = this.parent.getTranslation('modelo_mg_fr');
          break;
      }
    }
    this.byPoint = _byPoint;
    this.scaleSelectors = _scaleSelectors;
    this.xLabel = _xLabel;
    this.yLabel = _yLabel;
  }

  public closeGraph() {
    this.container.hidden = true;

    // Ocultar controles de gráfico
    const graphControls = document.getElementById('graphControls');
    if (graphControls) {
      graphControls.hidden = true;
    }

    // Ocultar leyenda de colores
    this.hideColorLegend();
  }

  public exportGraph(): void {
    const popGraph = document.getElementById('popGraph');
    if (!popGraph) return;

    const labelsDiv = document.getElementById('labels');
    const colorLegendDiv = document.getElementById('colorLegend');
    const headerHeight = 36;
    const padding = 12;
    const copyrightHeight = 20;

    // Obtener dimensiones del contenedor del gráfico
    const graphRect = popGraph.getBoundingClientRect();

    // Calcular el área útil del gráfico excluyendo el range selector
    const rangeSelBg = popGraph.querySelector('.dygraph-rangesel-bgcanvas') as HTMLCanvasElement;
    let plotBottomY = graphRect.height; // por defecto, todo el popGraph
    if (rangeSelBg) {
      const rsRect = rangeSelBg.getBoundingClientRect();
      plotBottomY = rsRect.top - graphRect.top; // cortar justo antes del range selector
    }

    const graphW = Math.round(graphRect.width);
    const graphH = Math.round(plotBottomY);

    // Calcular alto de labels
    let labelsH = 0;
    if (labelsDiv && labelsDiv.offsetHeight > 0) {
      labelsH = labelsDiv.offsetHeight + 8;
    }

    // Calcular alto de color legend
    let colorLegendH = 0;
    if (colorLegendDiv && colorLegendDiv.style.display !== 'none' && colorLegendDiv.offsetHeight > 0) {
      colorLegendH = colorLegendDiv.offsetHeight + 8;
    }

    const totalH = headerHeight + graphH + labelsH + colorLegendH + copyrightHeight;
    const totalW = graphW;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalW;
    exportCanvas.height = totalH;
    const ctx = exportCanvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // --- Barra de título (info del visor) ---
    const state = this.parent.getState();
    const varName = state.varName || '';
    const subVarName = state.subVarName || '';
    const tpSupport = state.tpSupport || '';
    const titleParts = [tpSupport, varName, subVarName].filter(s => s && s.length > 0);
    const headerText = titleParts.join(' - ') + (this.graphSubTitle || '');

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, totalW, headerHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(headerText, padding, headerHeight / 2);

    // Recortar al área del gráfico para que no se salga
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, headerHeight, totalW, graphH);
    ctx.clip();

    // --- Capturar canvases del gráfico (excluyendo range selector) ---
    const canvases = popGraph.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>;
    canvases.forEach((canvas) => {
      if (canvas.width <= 0 || canvas.height <= 0) return;
      // Excluir canvases del range selector
      if (canvas.classList.contains('dygraph-rangesel-bgcanvas') ||
          canvas.classList.contains('dygraph-rangesel-fgcanvas') ||
          canvas.classList.contains('dygraph-rangesel-zoomhandle')) return;
      const parent = canvas.parentElement;
      if (parent && (parent.classList.contains('dygraph-rangesel-bgcanvas') ||
          parent.classList.contains('dygraph-rangesel-fgcanvas'))) return;

      try {
        const rect = canvas.getBoundingClientRect();
        // Usar las dimensiones CSS (display) no las del atributo canvas
        const displayW = rect.width;
        const displayH = rect.height;
        const dx = rect.left - graphRect.left;
        const dy = rect.top - graphRect.top + headerHeight;
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, displayW, displayH);
      } catch (e) {
        console.warn('Error capturando canvas del gráfico:', e);
      }
    });

    // Dibujar título del gráfico (Dygraph: div.dygraph-title)
    const dygraphTitle = popGraph.querySelector('.dygraph-title') as HTMLElement;
    if (dygraphTitle && dygraphTitle.textContent) {
      const rect = dygraphTitle.getBoundingClientRect();
      const style = window.getComputedStyle(dygraphTitle);
      ctx.fillStyle = style.color || '#333333';
      ctx.font = (style.fontWeight || 'bold') + ' ' + (style.fontSize || '14px') + ' ' + (style.fontFamily || 'sans-serif');
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText(dygraphTitle.textContent, graphW / 2, rect.top - graphRect.top + headerHeight);
      ctx.textAlign = 'left';
    }

    // Dibujar etiqueta del eje Y (Dygraph: div.dygraph-ylabel)
    const yLabel = popGraph.querySelector('.dygraph-ylabel') as HTMLElement;
    if (yLabel && yLabel.textContent) {
      const rect = yLabel.getBoundingClientRect();
      const centerX = rect.left - graphRect.left + rect.width / 2;
      const centerY = rect.top - graphRect.top + rect.height / 2 + headerHeight;
      ctx.save();
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 13px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.translate(centerX, centerY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel.textContent, 0, 0);
      ctx.restore();
    }

    // Dibujar etiqueta del eje X (Dygraph: div.dygraph-xlabel)
    const xLabel = popGraph.querySelector('.dygraph-xlabel') as HTMLElement;
    if (xLabel && xLabel.textContent) {
      const rect = xLabel.getBoundingClientRect();
      ctx.fillStyle = '#333333';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText(xLabel.textContent, graphW / 2, rect.top - graphRect.top + headerHeight);
      ctx.textAlign = 'left';
    }

    // Dibujar etiquetas de ticks (div.dygraph-axis-label)
    const axisLabels = popGraph.querySelectorAll('.dygraph-axis-label') as NodeListOf<HTMLElement>;
    axisLabels.forEach((label) => {
      if (!label.textContent) return;
      const rect = label.getBoundingClientRect();
      // Excluir labels que caigan en la zona del range selector
      if (rect.top - graphRect.top >= plotBottomY) return;

      const style = window.getComputedStyle(label);
      ctx.fillStyle = style.color || '#333333';
      ctx.font = (style.fontSize || '11px') + ' ' + (style.fontFamily || 'sans-serif');

      if (label.classList.contains('dygraph-axis-label-y')) {
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(label.textContent, rect.right - graphRect.left, rect.top - graphRect.top + rect.height / 2 + headerHeight);
      } else {
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText(label.textContent, rect.left - graphRect.left + rect.width / 2, rect.top - graphRect.top + headerHeight);
      }
    });
    ctx.textAlign = 'left';

    // Restaurar clip
    ctx.restore();

    // --- Labels (leyenda de series Dygraph) ---
    let curY = headerHeight + graphH;
    if (labelsDiv && labelsDiv.offsetHeight > 0) {
      curY += 4;
      const labelsSpans = labelsDiv.querySelectorAll('span');
      let lx = padding;
      labelsSpans.forEach((span: HTMLSpanElement) => {
        const style = window.getComputedStyle(span);
        const color = style.color || '#333333';
        const fontWeight = style.fontWeight || 'normal';
        ctx.fillStyle = color;
        ctx.font = (fontWeight === 'bold' || fontWeight === '700' ? 'bold ' : '') + '11px sans-serif';
        ctx.textBaseline = 'top';
        const text = span.textContent || '';
        ctx.fillText(text, lx, curY);
        lx += ctx.measureText(text).width + 4;
      });
      curY += labelsH;
    }

    // --- Color Legend ---
    if (colorLegendDiv && colorLegendDiv.style.display !== 'none' && colorLegendDiv.offsetHeight > 0) {
      const items = colorLegendDiv.children;
      let lx = padding;
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        if (item.tagName === 'SPAN') {
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 11px sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.textContent || '', lx, curY + 8);
          lx += ctx.measureText(item.textContent || '').width + 8;
        } else {
          const colorBox = item.querySelector('div') as HTMLElement;
          const label = item.querySelector('span') as HTMLElement;
          if (colorBox) {
            ctx.fillStyle = colorBox.style.backgroundColor || '#ccc';
            ctx.fillRect(lx, curY + 2, 18, 12);
            lx += 20;
          }
          if (label) {
            ctx.fillStyle = '#333333';
            ctx.font = '11px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(label.textContent || '', lx, curY + 8);
            lx += ctx.measureText(label.textContent || '').width + 8;
          }
        }
      }
      curY += colorLegendH;
    }

    // --- Barra de logos (pie) ---
    this.drawLogosAndDownload(exportCanvas, ctx, 'grafico.png');
  }

  /**
   * Exporta un gráfico Chart.js con cabecera oscura multi-línea y barra de logos.
   * Uso: cada visor Chart.js llama a este método desde su exportGraph() pasando
   * las líneas de cabecera específicas (la estructura es común a todos los visores).
   * @param chartCanvas  Canvas del gráfico Chart.js
   * @param headerLines  Líneas de texto para la cabecera (primera en negrita)
   * @param filename     Nombre del fichero de descarga
   */
  protected exportChartJsGraph(
    chartCanvas: HTMLCanvasElement,
    headerLines: string[],
    filename: string
  ): void {
    const lineHeight = 18;
    const padding = 12;
    const headerHeight = Math.max(headerLines.length * lineHeight + padding, 36);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width  = chartCanvas.width;
    exportCanvas.height = headerHeight + chartCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Cabecera oscura
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, exportCanvas.width, headerHeight);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < headerLines.length; i++) {
      ctx.font = i === 0 ? 'bold 13px sans-serif' : '11px sans-serif';
      ctx.fillText(headerLines[i], padding, padding / 2 + lineHeight * i + lineHeight / 2);
    }

    // Gráfico
    ctx.drawImage(chartCanvas, 0, headerHeight);

    // Barra de logos + descarga
    this.drawLogosAndDownload(exportCanvas, ctx, filename);
  }

  protected drawLogosAndDownload(exportCanvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, filename: string): void {
    const logoImg = document.querySelector('#logo-container img') as HTMLImageElement;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      this.appendLogosBarAndDownload(exportCanvas, logoImg, filename);
    } else if (logoImg) {
      const clone = new Image();
      clone.crossOrigin = 'anonymous';
      clone.onload = () => this.appendLogosBarAndDownload(exportCanvas, clone, filename);
      clone.onerror = () => this.downloadExportCanvas(exportCanvas, filename);
      clone.src = logoImg.src;
    } else {
      this.downloadExportCanvas(exportCanvas, filename);
    }
  }

  protected appendLogosBarAndDownload(srcCanvas: HTMLCanvasElement, logoImg: HTMLImageElement, filename: string): void {
    const logoBarHeight = 60;
    const pad = 10;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = srcCanvas.width;
    finalCanvas.height = srcCanvas.height + logoBarHeight;
    const fCtx = finalCanvas.getContext('2d');

    fCtx.drawImage(srcCanvas, 0, 0);

    const barY = srcCanvas.height;
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, barY, finalCanvas.width, logoBarHeight);

    fCtx.strokeStyle = '#cccccc';
    fCtx.lineWidth = 1;
    fCtx.beginPath();
    fCtx.moveTo(0, barY);
    fCtx.lineTo(finalCanvas.width, barY);
    fCtx.stroke();

    // Copyright primero (para medir su ancho y reservar espacio)
    const copyrightText = '\u00A9 AEMET - CSIC PTI-Clima';
    fCtx.font = '10px sans-serif';
    fCtx.fillStyle = '#666666';
    fCtx.textBaseline = 'bottom';
    fCtx.textAlign = 'right';
    fCtx.fillText(copyrightText, finalCanvas.width - pad, barY + logoBarHeight - 4);
    fCtx.textAlign = 'left';
    const copyrightW = fCtx.measureText(copyrightText).width + pad * 2;

    // Logo: ajustar para no solapar el copyright
    const maxLogoH = logoBarHeight - pad * 2;
    const maxLogoW = finalCanvas.width - copyrightW - pad;
    const scaleH = maxLogoH / logoImg.naturalHeight;
    const scaleW = maxLogoW / logoImg.naturalWidth;
    const scale = Math.min(scaleH, scaleW);
    const logoW = logoImg.naturalWidth * scale;
    const logoH = logoImg.naturalHeight * scale;
    const logoX = pad;
    const logoY = barY + (logoBarHeight - logoH) / 2;
    fCtx.drawImage(logoImg, logoX, logoY, logoW, logoH);

    this.downloadExportCanvas(finalCanvas, filename);
  }

  protected downloadExportCanvas(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Configura y muestra una leyenda de colores personalizada
   * @param config Configuración de la leyenda con título y rangos de colores
   */
  public setColorLegend(config: ColorLegendConfig): void {
    const legendDiv = document.getElementById('colorLegend');
    if (!legendDiv) return;

    // Construir HTML de la leyenda
    let legendHTML = `<span style="font-weight: bold; margin-right: 5px; white-space: nowrap;">${config.title}</span>`;

    config.ranges.forEach(range => {
      legendHTML += `
        <div style="display: flex; align-items: center; gap: 2px;">
          <div style="width: 18px; height: 12px; background-color: ${range.color};"></div>
          <span style="white-space: nowrap;">${range.label}</span>
        </div>
      `;
    });

    legendDiv.innerHTML = legendHTML;
    legendDiv.style.display = 'flex';
  }

  /**
   * Configura y muestra una leyenda con HTML personalizado
   * Para casos complejos que requieren SVG u otros elementos personalizados
   * @param html HTML personalizado para la leyenda
   */
  public setCustomColorLegend(html: string): void {
    const legendDiv = document.getElementById('colorLegend');
    if (!legendDiv) return;

    legendDiv.innerHTML = html;
    legendDiv.style.display = 'flex';
  }

  /**
   * Oculta la leyenda de colores
   */
  public hideColorLegend(): void {
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }
  }

  private enableDownloadButton(){
    this.downloadButtonContainer.hidden = false
  }

  private disableStationDwButton(){
    this.downloadButtonContainer.hidden = false
    this.featureButtonContainer.hidden = true
  }

  private enableStationDwButton(station: any = []) {
    this.stationProps = station
    this.downloadButtonContainer.hidden = true
    this.featureButtonContainer.hidden = false
  }

public showGraph(data: any, latlng: CsLatLong = { lat: 0.0, lng: 0.0 }, station: any = []) {
    // Ocultar leyenda por defecto (cada tipo de gráfico decidirá si mostrarla)
    this.hideColorLegend();

    this.graphSubTitle = station.length != 0? ' - ' + station['name'] : ' ' + latlng.lat.toFixed(2) + ' N , ' + latlng.lng.toFixed(2) + ' E';
    this.container.hidden = false;
    
    if (Object.keys(station).length != 0) this.enableStationDwButton(station);
    else this.disableStationDwButton();

    let graph: Dygraph;
    let url: any;

    switch (this.graphType) {
        case "PercentileClock":
            if (typeof data === 'object' && data.currentValue !== undefined && data.historicalData !== undefined) {
                this.drawPercentileClockGraph(data.currentValue, data.historicalData, latlng);
            } else {
                console.error('Invalid data for PercentileClock:', data);
            }
            return; 
            case "ECDF":
            if (typeof data === 'object' && data.currentValue !== undefined && data.historicalData !== undefined) {
                this.drawECDFGraph(data.currentValue, data.historicalData, latlng);
            }
            return;
      case "Serial":
        graph = this.drawSerialGraph(data, latlng);
        break;
      case "Area":
        var file = new Blob([data], { type: 'text/plain' });
        url = URL.createObjectURL(file);
        graph = this.drawAreaGraph(url, latlng);
        break;
      case "Linear":
        graph = this.drawLinearGraph(data, station);
        break;
      case "Cummulative":
        graph = this.drawCummulativeGraph(data, latlng);
        break;
      case "MgFr":
        graph = this.drawMgFrGraph(data, station);
        break;
      case "WindRose":
        graph = this.drawWindRoseGraph(data, latlng);
        break;
    }
    // if (this.scaleSelectors) this.addScaleSelectors(graph)
    this.parent.completeGraph(graph, data);
  }

  /**
   * Parsea el valor X (fecha) para el gráfico.
   * En climatología, genera fechas sintéticas ignorando las del .nc
   */
  protected parseXValue(str: any): number {
    let readTime: string;
    const state = this.parent.getState();

    // Si es climatología, generar fechas sintéticas según timeSpan
    if (state.climatology) {
      const index = this.climatologyIndex;
      this.climatologyIndex++;

      if (state.timeSpan === CsTimeSpan.Month) {
        // Climatología mensual: 12 meses (enero-diciembre)
        const monthlyDates = [
          '1975-01-01', '1975-02-01', '1975-03-01', '1975-04-01',
          '1975-05-01', '1975-06-01', '1975-07-01', '1975-08-01',
          '1975-09-01', '1975-10-01', '1975-11-01', '1975-12-01'
        ];
        readTime = monthlyDates[index] || '1975-01-01';
      } else if (state.timeSpan === CsTimeSpan.Season) {
        // Climatología estacional: 4 estaciones (dic-ene, mar-may, jun-ago, sep-nov)
        const seasonalDates = [
          '1975-01-01',  // Invierno (dic-ene-feb)
          '1975-04-01',  // Primavera (mar-abr-may)
          '1975-07-01',  // Verano (jun-jul-ago)
          '1975-10-01'   // Otoño (sep-oct-nov)
        ];
        readTime = seasonalDates[index] || '1975-01-01';
      } else {
        // Climatología anual o fallback
        readTime = '1975-07-01';
      }
    } else {
      // No es climatología: usar fechas del .nc
      if (typeof str === "string") {
        readTime = str;
      } else {
        readTime = state.times[str - 1];
      }
    }

    return parseDate(readTime);
  }

  public drawSerialGraph(url: any, latlng: CsLatLong):Dygraph {
    let self = this

    // Resetear contador de climatología
    this.climatologyIndex = 0;

    // Ocultar leyenda de colores (no se usa en Serial)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    // Calcular y almacenar la media si los datos son una cadena
    if (typeof url === 'string') {
        this.currentMeanValue = this.calculateMean(url);
        console.log('Media calculada en drawSerialGraph:', this.currentMeanValue);
    }
    
    var graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 3,
        delimiter: ";",
        title: this.graphTitle + this.graphSubTitle,
        ylabel: this.yLabel,
        xlabel: "",
        showRangeSelector: true,
        xValueParser: function (str: any): number {
          return self.parseXValue(str);
        },
        axes: {
          x: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              let fecha = new Date(millis);
              let value = self.formatDate(fecha)
              return value;
            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              var fecha = new Date(number);
              
              const numRows = dygraph.numRows();
              
              if (numRows <= 12 && numRows > 4) {
                const monthNames = self.parent.getTranslation('monthsShort');
                return monthNames[fecha.getMonth()];
              } else if (numRows <= 4) {
                const seasonNames = self.parent.getTranslation('season');
                const season = Math.floor(fecha.getMonth() / 3);
                return seasonNames[season];
              } else {
                let value = self.formatDate(fecha);
                return value;
              }
            }
          },
          y: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              return " " + (millis < 0.01? millis.toFixed(3) : millis.toFixed(2));
            }
          }
        }
      }
    );
    return graph;
  }

  public setMeanLineConfig(config: Partial<MeanLineConfig>): void {
    this.meanLineConfig = { ...this.meanLineConfig, ...config };
  }

  public getCurrentMeanValue(): number {
    return this.currentMeanValue;
  }

  protected calculateMean(data: string): number {
    const lines = data.split('\n');
    let sum = 0;
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length > 0) {
            const parts = line.split(';');
            if (parts.length >= 2 && parts[1] !== '' && !isNaN(parseFloat(parts[1]))) {
                sum += parseFloat(parts[1]);
                count++;
            }
        }
    }

    return count > 0 ? sum / count : 0;
  }

  public drawMeanLine(canvas: CanvasRenderingContext2D, area: any, dygraph: Dygraph): void {
    if (!this.meanLineConfig.show || this.currentMeanValue === 0) return;
    
    // Obtener el rango Y actual del gráfico
    const yRange = dygraph.yAxisRange();
    
    // Verificar si la media está dentro del rango visible
    if (this.currentMeanValue < yRange[0] || this.currentMeanValue > yRange[1]) return;
    
    // Convertir valor de media a coordenadas del canvas
    const coords = dygraph.toDomCoords(0, this.currentMeanValue);
    const y = coords[1];
    
    // Verificar que la línea esté dentro del área del gráfico
    if (y < area.y || y > area.y + area.h) return;
    
    canvas.save();
    
    canvas.strokeStyle = 'rgba(46, 134, 171, 0.3)';
    canvas.lineWidth = this.meanLineConfig.lineWidth + 2;
    canvas.globalAlpha = 0.5;
    canvas.setLineDash(this.meanLineConfig.dashPattern);
    
    canvas.beginPath();
    canvas.moveTo(area.x, y + 2); // Desplazar la sombra ligeramente
    canvas.lineTo(area.x + area.w, y + 2);
    canvas.stroke();
    
    const gradient = canvas.createLinearGradient(area.x, 0, area.x + area.w, 0);
    gradient.addColorStop(0, this.meanLineConfig.color);
    gradient.addColorStop(0.3, this.adjustColorBrightness(this.meanLineConfig.color, 20));
    gradient.addColorStop(0.7, this.adjustColorBrightness(this.meanLineConfig.color, -10));
    gradient.addColorStop(1, this.meanLineConfig.color);
    
    canvas.strokeStyle = gradient;
    canvas.lineWidth = this.meanLineConfig.lineWidth;
    canvas.globalAlpha = 0.9;
    canvas.setLineDash(this.meanLineConfig.dashPattern);
    
    canvas.beginPath();
    canvas.moveTo(area.x, y);
    canvas.lineTo(area.x + area.w, y);
    canvas.stroke();
    
    canvas.setLineDash([]); // Resetear dash
    canvas.fillStyle = this.meanLineConfig.color;
    canvas.globalAlpha = 0.8;
    
    canvas.beginPath();
    canvas.arc(area.x + 5, y, 3, 0, 2 * Math.PI);
    canvas.fill();
    
    canvas.beginPath();
    canvas.arc(area.x + area.w - 5, y, 3, 0, 2 * Math.PI);
    canvas.fill();
  

    if (this.meanLineConfig.showLabel) {
        const labelText = `📊 ${this.meanLineConfig.labelText}: ${this.currentMeanValue.toFixed(3)}`;
        
        // Configurar texto
        canvas.font = 'bold 11px "Segoe UI", -apple-system, sans-serif';
        canvas.textAlign = 'left';
        
        const textMetrics = canvas.measureText(labelText);
        const padding = 8;
        const borderRadius = 6;
        
        // Posición de la etiqueta
        const labelX = area.x + 15;
        const labelY = Math.max(area.y + 25, y - 15);
        const labelWidth = textMetrics.width + (padding * 2);
        const labelHeight = 20;
        
        canvas.globalAlpha = 0.15;
        canvas.fillStyle = '#000000';
        this.roundedRect(canvas, labelX + 2, labelY - 12, labelWidth, labelHeight, borderRadius);
        canvas.fill();
        
        const labelGradient = canvas.createLinearGradient(labelX, labelY - 12, labelX, labelY + labelHeight - 12);
        labelGradient.addColorStop(0, this.adjustColorBrightness(this.meanLineConfig.color, 15));
        labelGradient.addColorStop(1, this.meanLineConfig.color);
        
        canvas.globalAlpha = 0.95;
        canvas.fillStyle = labelGradient;
        this.roundedRect(canvas, labelX, labelY - 12, labelWidth, labelHeight, borderRadius);
        canvas.fill();
 
        canvas.globalAlpha = 0.3;
        canvas.strokeStyle = this.adjustColorBrightness(this.meanLineConfig.color, -30);
        canvas.lineWidth = 1;
        this.roundedRect(canvas, labelX, labelY - 12, labelWidth, labelHeight, borderRadius);
        canvas.stroke();
  
        canvas.globalAlpha = 1;
        canvas.fillStyle = '#FFFFFF';
        canvas.fillText(labelText, labelX + padding, labelY);
    }
    
    canvas.restore();
  }

  private roundedRect(canvas: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    canvas.beginPath();
    canvas.moveTo(x + radius, y);
    canvas.lineTo(x + width - radius, y);
    canvas.quadraticCurveTo(x + width, y, x + width, y + radius);
    canvas.lineTo(x + width, y + height - radius);
    canvas.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    canvas.lineTo(x + radius, y + height);
    canvas.quadraticCurveTo(x, y + height, x, y + height - radius);
    canvas.lineTo(x, y + radius);
    canvas.quadraticCurveTo(x, y, x + radius, y);
    canvas.closePath();
  }

  // Método auxiliar para ajustar el brillo de un color
  private adjustColorBrightness(color: string, percent: number): string {
    // Convertir color hex a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Ajustar brillo
    const newR = Math.min(255, Math.max(0, r + (r * percent / 100)));
    const newG = Math.min(255, Math.max(0, g + (g * percent / 100)));
    const newB = Math.min(255, Math.max(0, b + (b * percent / 100)));
    
    // Convertir de vuelta a hex
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }
  
  public drawAreaGraph(url: any, latlng: CsLatLong): Dygraph {
    // Ocultar leyenda de colores (no se usa en Area)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    var graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 3,
        delimiter: ";",
        title: this.graphTitle + this.graphSubTitle,
        ylabel: this.yLabel,
        xlabel: this.xLabel || dateText,
        showRangeSelector: true,
        plotter: function (e: any) {
          let ctx = e.drawingContext;
          let region = new Path2D();

          // --- Recupero la posición Y en el canvas para el valor Y = 0
          let yPos;
          let canvasy0 = 0;
          let pointAnt = e.points[0];
          for (let point of e.points) {
            if (pointAnt.yval >= 0 && point.yval < 0) {  // --- Primer segmento que cruza el valor y=0
              let porcentaje = Math.abs(100 * point.yval / Math.abs(pointAnt.yval - point.yval)) // --- Calculo la distancia (en %) del último punto positivo al valor y=0
              canvasy0 = point.canvasy - ((point.canvasy - pointAnt.canvasy) * porcentaje) / 100; // --- Estimo el punto canvas y = 0 en función de ese % 
              break;
            }
            pointAnt = point;
          }
          yPos = e.plotArea.y + canvasy0 - 29;  // --- Hay 29 pixels de desplazamiento (dygraph-title)

          // ---- PRIMER PUNTO DEL POLÍGONO A PINTAR - (0,0) DE LA GRÁFICA: e.plotArea.x, e.plotArea.y + canvasy 
          region.moveTo(e.plotArea.x, yPos);
          
          // ---- PINTO EL RESTO DE LA GRÁFICA 
          for (let point of e.points) {
            ctx.lineTo(point.canvasx, point.canvasy);       // --- LÍNEA DE VALORES
            region.lineTo(point.canvasx, point.canvasy);    // --- ÁREA RELLENO CON COLORES
          }

          // ---- ÚLTIMO PUNTO DEL POLÍGONO A PINTAR - (XMax,0) DE LA GRÁFICA: e.points[e.points.length - 1].canvasx, e.plotArea.y + canvasy 
          region.lineTo(e.points[e.points.length - 1].canvasx, yPos);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,125,125,1)";

          if (canvasy0 != 0) {
            // --- GRADIENTE DE COLORES FORZADO A 0.001px EN TORNO A LA POSICIÓN Y = 0    
            let gradientFill = ctx.createLinearGradient(0, 0, 0, e.plotArea.h);
            gradientFill.addColorStop(0, "rgba(217,236,236,1)");
            gradientFill.addColorStop(yPos / e.plotArea.h - 0.001, "rgba(217,236,236,1)"); // --- VERDE PARA VALORES POSITIVOS
            gradientFill.addColorStop(yPos / e.plotArea.h + 0.001, "rgba(255,125,125,1)"); // --- ROJO PARA VALORES NEGATIVOS
            gradientFill.addColorStop(1, "rgba(255,125,125,1)");

            ctx.fillStyle = gradientFill;
            ctx.fill(region, "evenodd");
          }
        },
        xValueParser: function (str: any): number {
          let readTime: string
          if (typeof str == "string") {
            readTime = str;
          } else {
            readTime = this.parent.getState().times[str - 1];
          }
          return parseDate(readTime);
        },
        axes: {
          x: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              var fecha = new Date(millis);
              return fecha.getDate() + "/" + (fecha.getMonth() + 1) + "/" + fecha.getFullYear() + " ";

            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              var fecha = new Date(number);
              return (fecha.getMonth() + 1) + "/" + fecha.getFullYear() + " ";
            }
          },
          y: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              return " " + millis.toFixed(2);
            }
          }
        }
      }
    );
    return graph;
  }

  public drawLinearGraph(url: string, station: any): Dygraph {
    // Ocultar leyenda de colores (no se usa en Linear)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    let self = this;

    // Debug: ver las primeras líneas del CSV
    if (typeof url === 'string') {
      const lines = url.split('\n').slice(0, 5);
      console.log('[drawLinearGraph] First 5 lines of CSV:');
      lines.forEach((line, i) => console.log(`  Line ${i}: "${line}"`));
    }

    var graph = new Dygraph(
        document.getElementById("popGraph"),
        url,
        {
            labelsDiv: document.getElementById('labels'),
            digitsAfterDecimal: 1,
            title: this.graphTitle + this.graphSubTitle,
            ylabel: this.yLabel,
            xlabel: this.xLabel,
            // Ajustar márgenes para evitar solapamiento del yLabel
            axes: {
                y: {
                    axisLabelWidth: 80,
                    axisLabelFontSize: 12,
                    // Formatear números del eje Y
                    axisLabelFormatter: (y: number | Date) => {
                        if (typeof y === 'number') {
                            // Para duración (días), mostrar enteros. Para temperatura, mostrar decimales
                            const isDuration = this.yLabel.includes('Duración') || this.yLabel.includes('días');
                            if (isDuration) {
                                // Forzar entero, sin decimales
                                return Math.round(y).toString();
                            } else {
                                return parseFloat(y.toFixed(1)).toString().replace('.', ',');
                            }
                        }
                        return (y as Date).toLocaleDateString();
                    }
                },
                x: {
                    axisLabelFontSize: 12,
                    // Formatear números del eje X
                    axisLabelFormatter: (x: number | Date) => {
                        if (typeof x === 'number') {
                            // Para duración, el eje X son años (periodo de retorno), mostrar enteros
                            const isDuration = this.yLabel.includes('Duración') || this.yLabel.includes('días');
                            if (isDuration) {
                                return Math.round(x).toString();
                            } else {
                                return parseFloat(x.toFixed(1)).toString().replace('.', ',');
                            }
                        }
                        return (x as Date).toLocaleDateString();
                    }
                }
            },
            // Formatear valores en general (tooltips)
            valueFormatter: (y: number | Date) => {
                if (typeof y === 'number') {
                    // Para duración, mostrar enteros. Para temperatura, mostrar 3 decimales
                    const isDuration = this.yLabel.includes('Duración') || this.yLabel.includes('días');
                    const decimals = isDuration ? 0 : 3;
                    return parseFloat(y.toFixed(decimals)).toString().replace('.', ',');
                }
                return (y as Date).toLocaleDateString();
            },
            // Márgenes del gráfico
            rightGap: 20,
            yRangePad: 10,
            // Controlar la altura del eje X
            xAxisHeight: 30,
            // Underlay callback para dibujar el punto personalizado
            underlayCallback: function(canvas: CanvasRenderingContext2D, area: any, dygraph: Dygraph) {
              if (self.customPointData) {
                self.drawCustomPointWithTransformedData(canvas, area, dygraph, self.customPointData);
              }
            },
            drawCallback: (dygraph, is_initial) => {
                if (!is_initial) return;

                // Configure series only after data is loaded
                const labels = dygraph.getLabels();
                console.log('[drawLinearGraph] Detected labels:', labels);
                const seriesConfig: any = {};

                // Only add series config if the series exists in the data
                if (labels.includes('fit')) {
                    seriesConfig['fit'] = {
                        color: "#aa3311",
                        strokeWidth: 2
                    };
                }
                if (labels.includes('lwr')) {
                    seriesConfig['lwr'] = {
                        color: "#454545",
                        strokePattern: Dygraph.DASHED_LINE
                    };
                }
                if (labels.includes('upr')) {
                    seriesConfig['upr'] = {
                        color: "#454545",
                        strokePattern: Dygraph.DASHED_LINE
                    };
                }

                // Configurar series de años (para duración)
                // Si hay columnas que son años (números de 4 dígitos), configurarlas
                for (const label of labels) {
                    if (label !== 'ord' && /^\d{4}$/.test(label)) {
                        // Es un año, configurar como serie visible
                        seriesConfig[label] = {
                            color: label === labels[1] ? "#aa3311" : "#1166aa", // Primer año en rojo, segundo en azul
                            strokeWidth: 2
                        };
                        console.log(`[drawLinearGraph] Configured series for year: ${label}`);
                    }
                }

                // Update series configuration if we have any series
                if (Object.keys(seriesConfig).length > 0) {
                    console.log('[drawLinearGraph] Applying series config:', seriesConfig);
                    dygraph.updateOptions({ series: seriesConfig });
                }
            }
        }
    );

      // this.addScaleSelectors(graph)

      return graph;
  }
  
  public drawCummulativeGraph(url: any, latlng: CsLatLong): Dygraph {
    // Ocultar leyenda de colores (no se usa en Cummulative)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE SUMA ACUMULATIVA en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
  }

  public drawMgFrGraph(url: any, station: any): Dygraph {
    // Ocultar leyenda de colores (no se usa en MgFr)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    url = url.replace('ord,m0.3,p0.9,p1.5,p2.0', 'Años,Preindustrial,Actual,Futuro (1.5 °C),Futuro (2 °C)'); //-- Hacer mejor esto Manuel
    let graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 2,
        title: this.graphTitle + ' en la estación ' + station['name'],
        ylabel: 'Magnitud (' + this.parent.getState().legendTitle + ')',
        xlabel: 'Período de retorno (años)',
        axes: { x: { logscale: true } },

        series: {
          'Preindustrial': {
            color: "#0000ee"
          },
          'Actual': {
            color: "#00ee00",
            strokeWidth: 2
          },
          'Futuro (1.5 °C)': {
            color: "#ee0000",
            strokePattern: Dygraph.DASHED_LINE
          },
          'Futuro (2 °C)': {
            color: "#000",
          }
        }
      }
    );
    return graph
  }

  public drawWindRoseGraph(url: any, latlng: CsLatLong): Dygraph {
    // Ocultar leyenda de colores (no se usa en WindRose)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE WIND ROSE en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
  }

  public formatDate (date: Date):string {
    let dateMode = this.parent.getDateSelectorFrame().getMode();
    let value
    switch (dateMode) {
      case 0:
        value = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + " "
        break;
      case 1:
      case 2:
        value = (date.getMonth() + 1) + "/" + date.getFullYear() + " "
        break;
      case 3:
        value = date.getFullYear() + " "
        break;  
    }
    return value;
  }

  public minimize(): void {

  }

  public showFrame(): void {

  }

  // ========== Métodos para manejo de escalas logarítmicas ==========

  /**
   * Transforma datos para escala logarítmica
   */
  protected transformDataForLogScale(data: string, xLog: boolean, yLog: boolean): string {
    const lines = data.split('\n');
    const header = lines[0]; // Mantener header
    const transformedLines = [header];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() !== '') {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
          let x = parseFloat(parts[0]); // ord (años)
          let y = parseFloat(parts[1]); // retorno o fit (temperatura)

          // Transformar X si es necesario
          if (xLog) {
            if (x > 0) {
              x = Math.log10(x);
            } else {
              // Skip valores inválidos para log
              continue;
            }
          }

          // Transformar Y si es necesario
          if (yLog) {
            if (y > 0) {
              y = Math.log10(y);
            } else {
              // Skip valores inválidos para log
              continue;
            }
          }

          // Manejar datos con 2, 3 o 4 columnas
          let transformedLine = `${x},${y}`;

          // Si hay 3 columnas (duración: ord, año1, año2)
          if (parts.length === 3) {
            let year2 = parseFloat(parts[2]);

            // Transformar year2 si es necesario
            if (yLog) {
              if (year2 > 0) {
                year2 = Math.log10(year2);
              } else {
                continue;
              }
            }

            transformedLine += `,${year2}`;
          }
          // Si hay 4 columnas (temperatura: ord, fit, firstYear, lastYear)
          else if (parts.length >= 4) {
            let firstYear = parseFloat(parts[2]);
            let lastYear = parseFloat(parts[3]);

            // Transformar firstYear si es necesario
            if (yLog) {
              if (firstYear > 0) {
                firstYear = Math.log10(firstYear);
              } else {
                continue;
              }
            }

            // Transformar lastYear si es necesario
            if (yLog) {
              if (lastYear > 0) {
                lastYear = Math.log10(lastYear);
              } else {
                continue;
              }
            }

            transformedLine += `,${firstYear},${lastYear}`;
          }

          transformedLines.push(transformedLine);
        }
      }
    }

    const result = transformedLines.join('\n');
    return result;
  }

  /**
   * Crea formateador de ejes que muestra valores reales
   */
  protected createAxisFormatter(isLogScale: boolean) {
    return (value: number | Date) => {
      if (typeof value === 'number') {
        // Detectar si es duración
        const isDuration = this.yLabel.includes('Duración') || this.yLabel.includes('días');

        if (isLogScale) {
          // Convertir de vuelta a escala real
          const realValue = Math.pow(10, value);
          if (isDuration || realValue >= 1000) {
            return Math.round(realValue).toString();
          } else if (realValue >= 1) {
            return realValue.toFixed(1);
          } else {
            return realValue.toFixed(2);
          }
        } else {
          if (isDuration) {
            return Math.round(value).toString();
          } else {
            return parseFloat(value.toFixed(1)).toString();
          }
        }
      }
      return (value as Date).toLocaleDateString();
    };
  }

  /**
   * Actualiza el gráfico con configuraciones de escala
   */
  public updateGraphWithSettings(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
    this.currentXLogScale = xLogScale;
    this.currentYLogScale = yLogScale;

    // Transformar datos según la escala
    const transformedData = this.transformDataForLogScale(
      this.originalGraphData || '',
      xLogScale,
      yLogScale
    );

    const self = this;

    // Detectar el número de columnas
    const firstLine = (this.originalGraphData || '').split('\n')[0];
    const headerParts = firstLine.split(',');
    const numColumns = headerParts.length;

    // Configurar las series según el número de columnas
    let seriesConfig: any;
    let labelsConfig: string[] | undefined;

    if (numColumns === 4) {
      // Tenemos 4 columnas: ord, año_seleccionado, año_inicial, año_final (temperatura)
      const col1Name = headerParts[1].trim();
      const col2Name = headerParts[2].trim();
      const col3Name = headerParts[3].trim();

      seriesConfig = {
        [col1Name]: { color: "#aa3311", strokeWidth: 2, strokePattern: null },
        [col2Name]: { color: "#87CEEB", strokeWidth: 1.5, strokePattern: [5, 3] },  // Azul claro, línea discontinua
        [col3Name]: { color: "#4169E1", strokeWidth: 1.5, strokePattern: [5, 3] }    // Azul oscuro, línea discontinua
      };
      labelsConfig = undefined;
    } else if (numColumns === 3) {
      // Tenemos 3 columnas: ord, año1, año2 (duración)
      const col1Name = headerParts[1].trim();
      const col2Name = headerParts[2].trim();

      seriesConfig = {
        [col1Name]: { color: "#aa3311", strokeWidth: 2, strokePattern: null },      // Rojo para año seleccionado
        [col2Name]: { color: "#1166aa", strokeWidth: 2, strokePattern: null }       // Azul para primer año
      };
      labelsConfig = undefined;
    } else {
      // Una sola banda (2 columnas)
      seriesConfig = {
        'retorno': { color: "#aa3311", strokeWidth: 2 }
      };
    }

    const fullOptions = {
      file: transformedData,

      // Custom labels for legend (use actual year values instead of generic names)
      ...(labelsConfig ? { labels: labelsConfig } : {}),

      // Ejes con formateadores personalizados
      axes: {
        x: {
          logscale: false, // Siempre false en Dygraph
          axisLabelFontSize: 12,
          axisLabelFormatter: this.createAxisFormatter(xLogScale)
        },
        y: {
          logscale: false, // Siempre false en Dygraph
          axisLabelWidth: 80,
          axisLabelFontSize: 12,
          axisLabelFormatter: this.createAxisFormatter(yLogScale)
        }
      },

      series: seriesConfig,

      valueFormatter: (num: number | Date) => {
        if (typeof num === 'number') {
          // Mostrar valor real en tooltips
          if (this.currentYLogScale) {
            const realValue = Math.pow(10, num);
            return parseFloat(realValue.toFixed(3)).toString().replace('.', ',');
          } else {
            return parseFloat(num.toFixed(3)).toString().replace('.', ',');
          }
        }
        return (num as Date).toLocaleDateString();
      },

      // Underlay callback con punto manual
      underlayCallback: function(canvas: CanvasRenderingContext2D, area: any, dygraph: Dygraph) {
        if (self.customPointData) {
          self.drawCustomPointWithTransformedData(canvas, area, dygraph, self.customPointData);
        }
      },

      legendFormatter: (data: any) => {
        if (!data || data.x === null || data.x === undefined) return '';

        let html = '<div style="font-size: 12px; padding: 5px; white-space: nowrap;">';
        let unidad = "años";

        // Mostrar valor real en la leyenda
        let xValue: string;
        if (typeof data.x === 'number') {
          if (self.currentXLogScale) {
            const realX = Math.pow(10, data.x);
            xValue = realX.toFixed(1);
          } else {
            xValue = data.x.toFixed(1);
          }
        } else {
          xValue = String(data.x);
        }

        html += '<strong>' + unidad + ': ' + xValue + '</strong> | ';

        let seriesData: any = [];
        if (data.series && Array.isArray(data.series)) {
          data.series.forEach((series: any) => {
            if (series.y !== null && series.y !== undefined && typeof series.y === 'number') {
              let color = series.color;
              let label = series.label;

              // Mostrar valor real
              let value: string;
              if (self.currentYLogScale) {
                const realY = Math.pow(10, series.y);
                value = realY.toFixed(2);
              } else {
                value = series.y.toFixed(2);
              }

              seriesData.push(`<span style="color: ${color};">— ${label}: ${value}</span>`);
            }
          });
        }

        html += seriesData.join(' | ');
        html += '</div>';
        return html;
      }
    };

    graph.updateOptions(fullOptions);
  }

  /**
   * Dibuja punto personalizado con datos transformados
   */
  protected drawCustomPointWithTransformedData(canvas: CanvasRenderingContext2D, area: any, dygraph: Dygraph, pointData: {x: number, y: number}): void {
    try {
      // Transformar las coordenadas del punto según la escala actual
      let transformedX = pointData.x;
      let transformedY = pointData.y;

      if (this.currentXLogScale && pointData.x > 0) {
        transformedX = Math.log10(pointData.x);
      }

      if (this.currentYLogScale && pointData.y > 0) {
        transformedY = Math.log10(pointData.y);
      }

      // Usar las coordenadas transformadas con toDomCoords de Dygraph
      const domCoords = dygraph.toDomCoords(transformedX, transformedY);

      if (!domCoords || !isFinite(domCoords[0]) || !isFinite(domCoords[1])) {
        return;
      }

      // Verificar que está en el área visible
      const inBounds = domCoords[0] >= area.x && domCoords[0] <= area.x + area.w &&
                      domCoords[1] >= area.y && domCoords[1] <= area.y + area.h;

      if (!inBounds) {
        return;
      }

      // Dibujar punto AZUL para indicar que usa datos transformados
      canvas.save();

      // Círculo AZUL BRILLANTE más grande para mejor visibilidad
      canvas.fillStyle = '#0066CC';
      canvas.beginPath();
      canvas.arc(domCoords[0], domCoords[1], 10, 0, 2 * Math.PI);
      canvas.fill();

      // Borde blanco más grueso
      canvas.strokeStyle = '#FFFFFF';
      canvas.lineWidth = 2;
      canvas.stroke();

      // Etiqueta con valores originales usando configuración
      const yValueText = this.pointYUnit ? `${pointData.y.toFixed(1)} ${this.pointYUnit}` : `${pointData.y.toFixed(1)}`;
      const xValueText = this.pointXUnit ? `${pointData.x.toFixed(1)} ${this.pointXUnit}` : `${pointData.x.toFixed(1)}`;
      const labelText = `${this.pointYLabel}: ${yValueText} - ${this.pointXLabel}: ${xValueText}`;

      canvas.font = 'bold 12px Arial';
      canvas.fillStyle = '#000000';

      const textMetrics = canvas.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = 14;

      let textX = domCoords[0] + 12;
      let textY = domCoords[1] - 12;

      if (textX + textWidth > area.x + area.w) {
        textX = domCoords[0] - textWidth - 12;
      }
      if (textY - textHeight/2 < area.y) {
        textY = domCoords[1] + 25;
      }

      // Fondo azul claro
      canvas.fillStyle = '#dcdcdc' /* 'rgba(173, 216, 230, 0.9)' */;
      canvas.fillRect(textX - 3, textY - textHeight/2 - 2, textWidth + 6, textHeight + 4);

      // Borde azul oscuro
      canvas.strokeStyle = '#064d87' /* '#003d7a' */;
      canvas.lineWidth = 1;
      canvas.strokeRect(textX - 3, textY - textHeight/2 - 2, textWidth + 6, textHeight + 4);

      // Texto negro
      canvas.fillStyle = '#064d87'/* '#000000' */;
      canvas.textAlign = 'left';
      canvas.textBaseline = 'middle';
      canvas.fillText(labelText, textX, textY);

      canvas.restore();

    } catch (error) {
      console.error('Error dibujando punto transformado:', error);
    }
  }

  /**
   * Actualiza la escala del gráfico
   */
  protected updateGraphScale(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
    // Actualizar con transformación completa
    this.updateGraphWithSettings(graph, xLogScale, yLogScale);
  }

  /**
   * Procesa datos manteniendo solo las curvas (sin puntos personalizados)
   */
  public processDataWithCurvesOnly(data: string): string {
    let lines = data.split('\n');

    // Detectar el header para determinar el número de columnas
    const header = lines[0];
    const headerParts = header.split(',');
    // Detectar si tenemos 4 columnas válidas (independientemente de los nombres)
    const hasThreeBands = headerParts.length === 4;

    // Mantener el header original
    let processedLines = [header];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() !== '') {
        let parts = lines[i].split(',');

        // Determinar si es una línea de datos válida
        // Para 4 columnas: ord,fit,lwr,upr (o ord,fit,firstYear,lastYear)
        // Para 2 columnas: ord,retorno
        const expectedColumns = hasThreeBands ? 4 : 2;

        if (parts.length >= expectedColumns) {
          const ord = parts[0]?.trim();
          const fit = parts[1]?.trim();

          // Saltar si cualquier valor esencial está vacío
          if (!ord || !fit) {
            continue;
          }

          // Validar que son números válidos y finitos
          const ordNum = parseFloat(ord);
          const fitNum = parseFloat(fit);

          if (isNaN(ordNum) || isNaN(fitNum) || !isFinite(ordNum) || !isFinite(fitNum)) {
            continue;
          }

          if (hasThreeBands && parts.length >= 4) {
            // Procesar también las bandas (lwr, upr o firstYear, lastYear)
            const band1 = parts[2]?.trim();
            const band2 = parts[3]?.trim();

            if (!band1 || !band2) {
              continue;
            }

            const band1Num = parseFloat(band1);
            const band2Num = parseFloat(band2);

            if (isNaN(band1Num) || isNaN(band2Num) || !isFinite(band1Num) || !isFinite(band2Num)) {
              continue;
            }

            processedLines.push([ordNum.toFixed(6), fitNum.toFixed(6), band1Num.toFixed(6), band2Num.toFixed(6)].join(','));
          } else {
            // Solo dos columnas (ord, retorno)
            processedLines.push([ordNum.toFixed(6), fitNum.toFixed(6)].join(','));
          }
        } else if (parts.length >= 6 && parts[4] && parts[5]) {
          // Este es el punto personalizado - no procesarlo aquí
        }
      }
    }

    return processedLines.join('\n');
  }

  /**
   * Agrupa los datos por evento (una fila por evento en lugar de una fila por día)
   * CSV de entrada: date,extreme,mean,surface,duration,event
   * CSV de salida: date,extreme,mean,surface,duration,event,lastDate (con una fila por evento)
   */

  /**
   * Extrae datos de punto personalizado
   */
  public extractPointData(data: string): {x: number, y: number} | null {
    let lines = data.split('\n');
    let header = lines[0].split(',');

    // Detectar el formato del CSV
    // Formato climatología: ord,{year},{firstYear},{lastYear}
    // Formato monitorización: ord,fit,point,return
    const hasPointColumn = header.includes('point');

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() !== '') {
        let parts = lines[i].split(',');

        if (hasPointColumn) {
          // Formato monitorización: ord,fit,point,return
          // La fila del punto tiene: pointValue_x,,magnitude_y,magnitude_y
          // Buscar línea donde la columna "fit" (índice 1) está vacía y "point" (índice 2) tiene valor
          if (parts.length >= 4 && !parts[1] && parts[2] && parts[3]) {
            const x = parseFloat(parts[0]); // ord (período de retorno en eje X)
            const y = parseFloat(parts[2]); // point (temperatura en eje Y)

            if (!isNaN(x) && !isNaN(y)) {
              return { x, y };
            }
          }
        } else {
          // Formato antiguo (climatología u otros): buscar en columnas 4 y 5
          if (parts.length >= 6 && parts[4] && parts[5]) {
            const x = parseFloat(parts[4]);
            const y = parseFloat(parts[5]);

            if (!isNaN(x) && !isNaN(y)) {
              return { x, y };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Agrega selectores de escala al gráfico
   */
  public addScaleSelectors(graph: Dygraph): void {
    // Buscar si ya existe el contenedor de selectores
    let existingContainer = document.getElementById('scaleSelectorsContainer');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Crear el contenedor principal
    const mainContainer = document.createElement('div');
    mainContainer.id = 'scaleSelectorsContainer';

    // Crear selector para eje X
    const xContainer = this.createAxisSelector('x', 'Eje X (años)');
    mainContainer.appendChild(xContainer);

    // Crear selector para eje Y
    const yContainer = this.createAxisSelector('y', 'Eje Y (valores)');
    mainContainer.appendChild(yContainer);

    // Insertar el contenedor antes del gráfico
    const graphContainer = document.getElementById("popGraph");
    if (graphContainer && graphContainer.parentNode) {
      graphContainer.parentNode.insertBefore(mainContainer, graphContainer);
    }

    // Agregar eventos para cambiar las escalas
    this.attachScaleEvents(graph);
  }

  /**
   * Crea selector de eje individual
   */
  private createAxisSelector(axis: 'x' | 'y', labelText: string): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    const label = document.createElement('label');
    label.textContent = labelText + ': ';
    label.style.fontWeight = 'bold';
    label.style.minWidth = '100px';

    const select = document.createElement('select');
    select.id = `${axis}ScaleSelect`;
    select.style.padding = '4px 8px';
    select.style.border = '1px solid #ccc';
    select.style.borderRadius = '4px';

    let linearSeleceted = true;
    if (axis === 'x') {
      linearSeleceted = !this.currentXLogScale;
    } else {
      linearSeleceted = !this.currentYLogScale;
    }


    // Opciones del selector
    const linearOption = document.createElement('option');
    linearOption.value = 'linear';
    linearOption.textContent = 'Lineal';
    linearOption.selected = linearSeleceted;

    const logOption = document.createElement('option');
    logOption.value = 'logarithmic';
    logOption.textContent = 'Logarítmica';
    logOption.selected = !linearSeleceted;


    select.appendChild(linearOption);
    select.appendChild(logOption);

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  /**
   * Adjunta eventos a los selectores de escala
   */
  private attachScaleEvents(graph: Dygraph): void {
    const xSelect = document.getElementById('xScaleSelect') as HTMLSelectElement;
    if (xSelect) {
      xSelect.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        const ySelect = document.getElementById('yScaleSelect') as HTMLSelectElement;
        this.updateGraphScale(graph, target.value === 'logarithmic', ySelect?.value === 'logarithmic');
      });
    }

    const ySelect = document.getElementById('yScaleSelect') as HTMLSelectElement;
    if (ySelect) {
      ySelect.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        const xSelect = document.getElementById('xScaleSelect') as HTMLSelectElement;
        this.updateGraphScale(graph, xSelect?.value === 'logarithmic', target.value === 'logarithmic');
      });
    }
  }

  /**
   * Debug del formato de datos (útil para desarrollo)
   */
  public debugDataFormat(data?: string): void {
    const dataToAnalyze = data || this.originalGraphData;
    if (!dataToAnalyze) {
      return;
    }

    const lines = dataToAnalyze.split('\n');

    let curveCount = 0;
    let pointCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const parts = lines[i].split(',');

        if (parts.length >= 6 && parts[4] && parts[5]) {
          pointCount++;
        } else if (parts.length >= 4 && parts[0] && parts[1] && parts[2] && parts[3]) {
          curveCount++;
        } else {
          errorCount++;
        }
      }
    }
  }

  /**
   * Setters y getters para datos originales del gráfico
   */
  public setOriginalGraphData(data: string): void {
    this.originalGraphData = data;
  }

  public getOriginalGraphData(): string | null {
    return this.originalGraphData;
  }

  public setCustomPointData(point: {x: number, y: number} | null): void {
    this.customPointData = point;
  }

  public getCustomPointData(): {x: number, y: number} | null {
    return this.customPointData;
  }

  public setYearLabels(firstYear: number, lastYear: number): void {
    this.firstYearLabel = firstYear.toString();
    this.lastYearLabel = lastYear.toString();
  }

  public setPointLabels(yLabel: string, yUnit: string, xLabel: string, xUnit: string): void {
    this.pointYLabel = yLabel;
    this.pointYUnit = yUnit;
    this.pointXLabel = xLabel;
    this.pointXUnit = xUnit;
  }

  public drawPercentileClockGraph(currentValue: number, historicalData: number[], latlng: CsLatLong): void {
    const container = document.getElementById("popGraph");
    if (!container) return;

    // Calcular percentil
    const percentile = this.calculatePercentile(currentValue, historicalData);
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 450;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuración del reloj
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20;
    const radius = 150;
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Clasificación Percentil', centerX, 40);
    ctx.font = '12px Arial';
    ctx.fillText(`${latlng.lat.toFixed(2)}N, ${latlng.lng.toFixed(2)}E`, centerX, 60);

    // Dibujar arco de fondo con gradiente de colores (verde → amarillo → naranja → rojo)
    this.drawColorGradientArc(ctx, centerX, centerY, radius);
    
    // Dibujar marcas de percentiles (0, 25, 50, 75, 100)
    this.drawPercentileMarks(ctx, centerX, centerY, radius);
    
    // Dibujar aguja indicadora
    this.drawNeedle(ctx, centerX, centerY, radius - 20, percentile);
    
    // Dibujar valor central
    ctx.fillStyle = '#333';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`P${Math.round(percentile)}`, centerX, centerY + 10);
    
    // Valor actual
    ctx.font = '14px Arial';
    ctx.fillText(`${currentValue.toFixed(2)} ${this.parent.getState().legendTitle}`, centerX, centerY + 35);
    
    // Clasificación textual
    const classification = this.getClassification(percentile);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = classification.color;
    ctx.fillText(classification.text, centerX, centerY + 60);
}

private calculatePercentile(value: number, data: number[]): number {
  this.debugPercentileData(value, data);
    const validData = data.filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
    
    console.log('=== Calculate Percentile ===');
    console.log('Current value:', value);
    console.log('Valid data length:', validData.length);
    
    if (validData.length === 0) return 50;
    if (validData.length === 1) {
        return value >= validData[0] ? 100 : 0;
    }
    
    const minValue = validData[0];
    const maxValue = validData[validData.length - 1];
    
    console.log('Min value:', minValue);
    console.log('Max value:', maxValue);
    
    // Casos límite
    if (value <= minValue) return 0;
    if (value >= maxValue) return 100;
    
    // Encontrar la posición del valor en los datos ordenados
    // usando interpolación lineal
    let lowerIndex = -1;
    let upperIndex = -1;
    
    for (let i = 0; i < validData.length - 1; i++) {
        if (validData[i] <= value && value <= validData[i + 1]) {
            lowerIndex = i;
            upperIndex = i + 1;
            break;
        }
    }
    
    // Si encontramos los índices, interpolar
    if (lowerIndex >= 0 && upperIndex >= 0) {
        const lowerValue = validData[lowerIndex];
        const upperValue = validData[upperIndex];
        
        // Interpolación lineal entre los dos índices
        const fraction = (value - lowerValue) / (upperValue - lowerValue);
        const interpolatedPosition = lowerIndex + fraction;
        
        // Convertir a percentil (0-100)
        const percentile = (interpolatedPosition / (validData.length - 1)) * 100;
        
        console.log('Interpolation:', {
            lowerIndex,
            upperIndex,
            lowerValue,
            upperValue,
            fraction,
            percentile
        });
        
        return Math.max(0, Math.min(100, percentile));
    }
    
    let position = 0;
    for (let i = 0; i < validData.length; i++) {
        if (validData[i] <= value) {
            position = i;
        }
    }
    
    const percentile = (position / (validData.length - 1)) * 100;
    console.log('Fallback percentile:', percentile);
    
    return Math.max(0, Math.min(100, percentile));
}

private debugPercentileData(value: number, data: number[]): void {
    const validData = data.filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
    
    console.log('=== DEBUG PERCENTILE DATA ===');
    console.log('Total values:', data.length);
    console.log('Valid values:', validData.length);
    console.log('Current value:', value);
    console.log('Min:', Math.min(...validData));
    console.log('Max:', Math.max(...validData));
    console.log('Mean:', validData.reduce((a,b) => a+b, 0) / validData.length);
    console.log('Median:', validData[Math.floor(validData.length / 2)]);
    console.log('First 10:', validData.slice(0, 10));
    console.log('Last 10:', validData.slice(-10));
    
    for (let i = 0; i <= 10; i++) {
        const index = Math.floor((validData.length - 1) * i / 10);
        console.log(`P${i * 10}: ${validData[index]?.toFixed(2)}`);
    }
}

public showBothPercentileGraphs(data: any, latlng: CsLatLong): void {
    console.log('=== Showing both percentile graphs ===');
    
    const container = document.getElementById("popGraph");
    if (!container) return;

    // Validar datos
    if (typeof data !== 'object' || data.currentValue === undefined || data.historicalData === undefined) {
        console.error('Invalid data for percentile graphs:', data);
        return;
    }

    const { currentValue, historicalData } = data;
    
    this.container.hidden = false;
    this.disableStationDwButton();
    
    container.innerHTML = '';
    
    const graphsContainer = document.createElement('div');
    graphsContainer.style.display = 'flex';
    graphsContainer.style.gap = '20px';
    graphsContainer.style.justifyContent = 'center';
    graphsContainer.style.alignItems = 'flex-start';
    graphsContainer.style.padding = '20px';
    container.appendChild(graphsContainer);
    
    const percentile = this.calculatePercentile(currentValue, historicalData);
    
    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 400;
    clockCanvas.height = 450;
    graphsContainer.appendChild(clockCanvas);
    
    const clockCtx = clockCanvas.getContext('2d');
    if (clockCtx) {
        this.drawPercentileClockContent(clockCtx, clockCanvas, currentValue, historicalData, latlng, percentile);
    }
    
    const ecdfCanvas = document.createElement('canvas');
    ecdfCanvas.width = 600;
    ecdfCanvas.height = 450;
    graphsContainer.appendChild(ecdfCanvas);
    
    const ecdfCtx = ecdfCanvas.getContext('2d');
    if (ecdfCtx) {
        this.drawECDFContent(ecdfCtx, ecdfCanvas, currentValue, historicalData, latlng, percentile);
    }
}

private drawPercentileClockContent(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    currentValue: number,
    historicalData: number[],
    latlng: CsLatLong,
    percentile: number
): void {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20;
    const radius = 150;
    
    // ... código de dibujado existente sin cambios ...
    
    // Título
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Clasificación Percentil', centerX, 30);
    ctx.font = '11px Arial';
    ctx.fillText(`${latlng.lat.toFixed(2)}N, ${latlng.lng.toFixed(2)}E`, centerX, 50);

    this.drawColorGradientArc(ctx, centerX, centerY, radius);
    this.drawPercentileMarks(ctx, centerX, centerY, radius);
    this.drawNeedle(ctx, centerX, centerY, radius - 20, percentile);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`P${Math.round(percentile)}`, centerX, centerY + 10);
    
    ctx.font = '14px Arial';
    ctx.fillText(`${currentValue.toFixed(2)} ${this.parent.getState().legendTitle}`, centerX, centerY + 35);
    
    const classification = this.getClassification(percentile);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = classification.color;
    ctx.fillText(classification.text, centerX, centerY + 60);
    
    // AÑADIR INTERACTIVIDAD
    this.addClockInteractivity(canvas, centerX, centerY, radius, percentile, currentValue, historicalData);
}

private addClockInteractivity(
    canvas: HTMLCanvasElement,
    centerX: number,
    centerY: number,
    radius: number,
    percentile: number,
    currentValue: number,
    historicalData: number[]
): void {
    // Crear tooltip
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '10000';
    tooltip.style.whiteSpace = 'nowrap';
    document.body.appendChild(tooltip);
    
    // Calcular estadísticas
    const validData = historicalData.filter(v => !isNaN(v) && isFinite(v));
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calcular distancia al centro
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Verificar si está sobre el arco de colores
        if (distance >= radius - 35 && distance <= radius + 15) {
            // Calcular ángulo
            let angle = Math.atan2(dy, dx);
            if (angle < 0) angle += 2 * Math.PI;
            
            const startAngle = Math.PI * 0.75;
            const endAngle = Math.PI * 2.25;
            
            // Normalizar ángulo para el arco
            let normalizedAngle = angle;
            if (angle < startAngle) normalizedAngle += 2 * Math.PI;
            
            if (normalizedAngle >= startAngle && normalizedAngle <= endAngle) {
                // Calcular percentil en esta posición
                const percentileAtPosition = ((normalizedAngle - startAngle) / (endAngle - startAngle)) * 100;
                
                // Obtener clasificación
                const classification = this.getClassification(percentileAtPosition);
                
                // Mostrar tooltip
                tooltip.innerHTML = `
                    <strong>P${Math.round(percentileAtPosition)}</strong><br/>
                    Clasificación: ${classification.text}<br/>
                    Datos históricos: ${validData.length} valores
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
                canvas.style.cursor = 'pointer';
                return;
            }
        }
        
        // Verificar si está sobre el centro (estadísticas)
        if (distance <= 60) {
            tooltip.innerHTML = `
                <strong>Estadísticas</strong><br/>
                Mínimo: ${min.toFixed(2)}<br/>
                Máximo: ${max.toFixed(2)}<br/>
                Media: ${mean.toFixed(2)}<br/>
                Actual: ${currentValue.toFixed(2)} (P${Math.round(percentile)})
            `;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
            canvas.style.cursor = 'help';
            return;
        }
        
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    });
    
    // Limpiar tooltip al cerrar
    const closeButton = document.querySelector('.popup-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (tooltip.parentNode) {
                document.body.removeChild(tooltip);
            }
        });
    }
}

private drawECDFContent(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    currentValue: number,
    historicalData: number[],
    latlng: CsLatLong,
    percentile: number
): void {
    const ecdfData = this.calculateECDF(historicalData);
    
    const padding = { top: 60, right: 40, bottom: 60, left: 70 };
    const plotWidth = canvas.width - padding.left - padding.right;
    const plotHeight = canvas.height - padding.top - padding.bottom;
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Curva ECDF', canvas.width / 2, 30);
    ctx.font = '11px Arial';
    ctx.fillText(`${latlng.lat.toFixed(2)}N, ${latlng.lng.toFixed(2)}E`, canvas.width / 2, 50);

    this.drawECDFAxes(ctx, padding, plotWidth, plotHeight, ecdfData);
    this.drawECDFCurve(ctx, padding, plotWidth, plotHeight, ecdfData);
    this.drawCurrentPoint(ctx, padding, plotWidth, plotHeight, currentValue, percentile, ecdfData);
    this.drawECDFLegend(ctx, canvas.width, currentValue, percentile);
    
    this.addECDFInteractivity(canvas, padding, plotWidth, plotHeight, ecdfData, currentValue);
}

private addECDFInteractivity(
    canvas: HTMLCanvasElement,
    padding: {top: number, right: number, bottom: number, left: number},
    plotWidth: number,
    plotHeight: number,
    ecdfData: {value: number, percentile: number}[],
    currentValue: number
): void {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '10000';
    document.body.appendChild(tooltip);
    
    const minValue = Math.min(...ecdfData.map(d => d.value));
    const maxValue = Math.max(...ecdfData.map(d => d.value));
    const valueRange = maxValue - minValue;
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Verificar si está dentro del área del gráfico
        if (mouseX >= padding.left && mouseX <= padding.left + plotWidth &&
            mouseY >= padding.top && mouseY <= padding.top + plotHeight) {
            
            // Convertir coordenadas del mouse a valores del gráfico
            const valueAtMouse = minValue + ((mouseX - padding.left) / plotWidth) * valueRange;
            const percentileAtMouse = 100 - ((mouseY - padding.top) / plotHeight) * 100;
            
            // Encontrar el punto más cercano en la curva
            let closestPoint = ecdfData[0];
            let minDistance = Infinity;
            
            ecdfData.forEach(point => {
                const px = padding.left + ((point.value - minValue) / valueRange) * plotWidth;
                const py = padding.top + plotHeight - (point.percentile / 100) * plotHeight;
                const distance = Math.sqrt(Math.pow(mouseX - px, 2) + Math.pow(mouseY - py, 2));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            
            if (minDistance < 20) {
                const isCurrent = Math.abs(closestPoint.value - currentValue) < 0.01;
                
                tooltip.innerHTML = `
                    <strong>${isCurrent ? 'Valor Actual' : 'Punto en Curva'}</strong><br/>
                    Valor: ${closestPoint.value.toFixed(2)} ${this.parent.getState().legendTitle}<br/>
                    Percentil: P${Math.round(closestPoint.percentile)}<br/>
                    ${isCurrent ? '<em>Este es tu valor actual</em>' : ''}
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
                canvas.style.cursor = 'crosshair';
                return;
            }
            
            tooltip.innerHTML = `
                Valor: ${valueAtMouse.toFixed(2)}<br/>
                Percentil: ~P${Math.round(percentileAtMouse)}
            `;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
            canvas.style.cursor = 'crosshair';
        } else {
            tooltip.style.display = 'none';
            canvas.style.cursor = 'default';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    });
    
    // Limpiar tooltip al cerrar
    const closeButton = document.querySelector('.popup-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (tooltip.parentNode) {
                document.body.removeChild(tooltip);
            }
        });
    }
}

public drawECDFGraph(currentValue: number, historicalData: number[], latlng: CsLatLong): void {
    const container = document.getElementById("popGraph");
    if (!container) return;

    // Preparar datos para ECDF
    const ecdfData = this.calculateECDF(historicalData);
    const currentPercentile = this.calculatePercentile(currentValue, historicalData);
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 500;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { top: 60, right: 40, bottom: 60, left: 70 };
    const plotWidth = canvas.width - padding.left - padding.right;
    const plotHeight = canvas.height - padding.top - padding.bottom;
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Función de Distribución Acumulada Empírica (ECDF)', canvas.width / 2, 30);
    ctx.font = '12px Arial';
    ctx.fillText(`${latlng.lat.toFixed(2)}N, ${latlng.lng.toFixed(2)}E`, canvas.width / 2, 50);

    this.drawECDFAxes(ctx, padding, plotWidth, plotHeight, ecdfData);

    this.drawECDFCurve(ctx, padding, plotWidth, plotHeight, ecdfData);
    
    this.drawCurrentPoint(ctx, padding, plotWidth, plotHeight, currentValue, currentPercentile, ecdfData);
    
    this.drawECDFLegend(ctx, canvas.width, currentValue, currentPercentile);
}

private calculateECDF(data: number[]): {value: number, percentile: number}[] {
    // Filtrar y ordenar datos válidos
    const validData = data.filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
    
    if (validData.length === 0) return [];
    
    // Calcular ECDF
    const ecdfPoints: {value: number, percentile: number}[] = [];
    
    for (let i = 0; i < validData.length; i++) {
        const percentile = ((i + 1) / validData.length) * 100;
        ecdfPoints.push({
            value: validData[i],
            percentile: percentile
        });
    }
    
    return ecdfPoints;
}

private drawECDFAxes(
    ctx: CanvasRenderingContext2D, 
    padding: {top: number, right: number, bottom: number, left: number},
    plotWidth: number, 
    plotHeight: number,
    ecdfData: {value: number, percentile: number}[]
): void {
    const minValue = Math.min(...ecdfData.map(d => d.value));
    const maxValue = Math.max(...ecdfData.map(d => d.value));
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    
    // Eje X
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    ctx.stroke();
    
    // Eje Y
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.stroke();
    
    // Etiquetas eje X (valores)
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
        const value = minValue + (maxValue - minValue) * (i / numXTicks);
        const x = padding.left + (plotWidth * i / numXTicks);
        
        ctx.fillText(value.toFixed(1), x, padding.top + plotHeight + 30);
        
        // Marca de tick
        ctx.beginPath();
        ctx.moveTo(x, padding.top + plotHeight);
        ctx.lineTo(x, padding.top + plotHeight + 5);
        ctx.stroke();
    }

      const canvas = ctx.canvas;
    
    // Label eje X
    ctx.font = 'bold 14px Arial';
    ctx.fillText(
        `${this.parent.getState().legendTitle}`,
        padding.left + plotWidth / 2,
        canvas.height - 10
    );
    
    // Etiquetas eje Y (percentiles)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    
    const numYTicks = 5;
    for (let i = 0; i <= numYTicks; i++) {
        const percentile = 100 * (i / numYTicks);
        const y = padding.top + plotHeight - (plotHeight * i / numYTicks);
        
        ctx.fillText(percentile.toFixed(0), padding.left - 10, y);
        
        // Marca de tick
        ctx.beginPath();
        ctx.moveTo(padding.left - 5, y);
        ctx.lineTo(padding.left, y);
        ctx.stroke();
        
        // Línea de grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + plotWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
    }
    
    // Label eje Y
    ctx.save();
    ctx.translate(20, padding.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Percentil (%)', 0, 0);
    ctx.restore();
}

private drawECDFCurve(
    ctx: CanvasRenderingContext2D,
    padding: {top: number, right: number, bottom: number, left: number},
    plotWidth: number,
    plotHeight: number,
    ecdfData: {value: number, percentile: number}[]
): void {
    if (ecdfData.length === 0) return;
    
    const minValue = Math.min(...ecdfData.map(d => d.value));
    const maxValue = Math.max(...ecdfData.map(d => d.value));
    const valueRange = maxValue - minValue;
    
    // Dibujar curva
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    ecdfData.forEach((point, index) => {
        const x = padding.left + ((point.value - minValue) / valueRange) * plotWidth;
        const y = padding.top + plotHeight - (point.percentile / 100) * plotHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Añadir puntos en la curva
    ctx.fillStyle = '#2196F3';
    ecdfData.forEach((point, index) => {
        if (index % Math.max(1, Math.floor(ecdfData.length / 20)) === 0) {
            const x = padding.left + ((point.value - minValue) / valueRange) * plotWidth;
            const y = padding.top + plotHeight - (point.percentile / 100) * plotHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

private drawCurrentPoint(
    ctx: CanvasRenderingContext2D,
    padding: {top: number, right: number, bottom: number, left: number},
    plotWidth: number,
    plotHeight: number,
    currentValue: number,
    currentPercentile: number,
    ecdfData: {value: number, percentile: number}[]
): void {
    const minValue = Math.min(...ecdfData.map(d => d.value));
    const maxValue = Math.max(...ecdfData.map(d => d.value));
    const valueRange = maxValue - minValue;
    
    const x = padding.left + ((currentValue - minValue) / valueRange) * plotWidth;
    const y = padding.top + plotHeight - (currentPercentile / 100) * plotHeight;
    
    // Líneas de guía
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Línea vertical
    ctx.beginPath();
    ctx.moveTo(x, padding.top + plotHeight);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Línea horizontal
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Punto actual 
    ctx.fillStyle = '#FF5722';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Etiqueta del punto
    ctx.fillStyle = '#FF5722';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
        `Actual: ${currentValue.toFixed(2)} (P${Math.round(currentPercentile)})`,
        x + 15,
        y - 5
    );
}

private drawECDFLegend(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    currentValue: number,
    currentPercentile: number
): void {
    const legendX = canvasWidth - 200;
    const legendY = 80;
    
    // Fondo de la leyenda
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.fillRect(legendX, legendY, 180, 80);
    ctx.strokeRect(legendX, legendY, 180, 80);
    
    // Título
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Leyenda', legendX + 10, legendY + 20);
    
    // Curva ECDF
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX + 10, legendY + 35);
    ctx.lineTo(legendX + 30, legendY + 35);
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.fillText('Curva ECDF', legendX + 40, legendY + 38);
    
    // Punto actual
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(legendX + 20, legendY + 55, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillText('Valor actual', legendX + 40, legendY + 58);
}

private drawColorGradientArc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    const startAngle = Math.PI * 0.75; // 135 grados
    const endAngle = Math.PI * 2.25;   // 405 grados (270° de arco)
    
    // Dibujar segmentos de color
    const segments = [
        { start: 0, end: 0.20, color: '#4CAF50' },   
        { start: 0.20, end: 0.40, color: '#8BC34A' }, 
        { start: 0.40, end: 0.60, color: '#FFC107' }, 
        { start: 0.60, end: 0.80, color: '#FF9800' }, 
        { start: 0.80, end: 1.00, color: '#F44336' } 
    ];
    
    segments.forEach(seg => {
        const segStart = startAngle + (endAngle - startAngle) * seg.start;
        const segEnd = startAngle + (endAngle - startAngle) * seg.end;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, segStart, segEnd);
        ctx.lineWidth = 30;
        ctx.strokeStyle = seg.color;
        ctx.stroke();
    });
    
    // Borde externo
    ctx.beginPath();
    ctx.arc(x, y, radius + 15, startAngle, endAngle);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ddd';
    ctx.stroke();
    
    // Borde interno
    ctx.beginPath();
    ctx.arc(x, y, radius - 15, startAngle, endAngle);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ddd';
    ctx.stroke();
}

private drawPercentileMarks(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    const startAngle = Math.PI * 0.75;
    const totalAngle = Math.PI * 1.5; // 270 grados
    
    const marks = [
        { percentile: 0, label: 'P0' },
        { percentile: 25, label: 'P25' },
        { percentile: 50, label: 'P50' },
        { percentile: 75, label: 'P75' },
        { percentile: 100, label: 'P100' }
    ];
    
    marks.forEach(mark => {
        const angle = startAngle + (totalAngle * mark.percentile / 100);
        
        // Línea de marca
        const innerR = radius - 20;
        const outerR = radius + 20;
        
        ctx.beginPath();
        ctx.moveTo(
            x + Math.cos(angle) * innerR,
            y + Math.sin(angle) * innerR
        );
        ctx.lineTo(
            x + Math.cos(angle) * outerR,
            y + Math.sin(angle) * outerR
        );
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#666';
        ctx.stroke();
        
        // Etiqueta
        const labelR = radius + 40;
        ctx.fillStyle = '#666';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            mark.label,
            x + Math.cos(angle) * labelR,
            y + Math.sin(angle) * labelR
        );
    });
}

private drawNeedle(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, percentile: number): void {
    const startAngle = Math.PI * 0.75;
    const totalAngle = Math.PI * 1.5;
    const angle = startAngle + (totalAngle * percentile / 100);
    
    // Sombra de la aguja
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Dibujar aguja
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
    );
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#333';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.restore();
    
    // Círculo central
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
}

private getClassification(percentile: number): {text: string, color: string} {
    if (percentile < 10) return { text: 'Muy Bajo', color: '#4CAF50' };
    if (percentile < 25) return { text: 'Bajo', color: '#8BC34A' };
    if (percentile < 50) return { text: 'Medio-Bajo', color: '#FFC107' };
    if (percentile < 75) return { text: 'Medio-Alto', color: '#FF9800' };
    if (percentile < 90) return { text: 'Alto', color: '#FF5722' };
    return { text: 'Muy Alto', color: '#F44336' };
}
}

function parseDate(input: string) { //"28/10/50"
  if (typeof input !== "undefined") {
    input = input.replace('"', "").replace('"', "");
    let year: number, month: number, day: number;
    if (input.indexOf('/') > -1) {
      var parts = input.split('/');
      year = parseInt(parts[2]);
      if (year < 50) {
        year = 2000 + year;
      } else if (year >= 50 && year < 100) {
        year = 1900 + year;
      }
      month = parseInt(parts[1]);
      day = parseInt(parts[0]);
    } else {
      var parts = input.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    }
    return Date.UTC(year, month - 1, day);
  } else {
    return null;
  }
}

// Clase o módulo compartido para almacenar el estado del punto
export class GraphPointManager {
  private static instance: GraphPointManager;
  private customPoint: {x: number, y: number} | null = null;
  private drawCallback: Function | null = null;
  
  public static getInstance(): GraphPointManager {
      if (!GraphPointManager.instance) {
          GraphPointManager.instance = new GraphPointManager();
      }
      return GraphPointManager.instance;
  }
  
  public setCustomPoint(x: number, y: number, drawCallback: Function): void {
      this.customPoint = {x, y};
      this.drawCallback = drawCallback;
  }
  
  public getCustomPoint(): {x: number, y: number} | null {
      return this.customPoint;
  }
  
  public getDrawCallback(): Function | null {
      return this.drawCallback;
  }
  
  public clearCustomPoint(): void {
      this.customPoint = null;
      this.drawCallback = null;
  }
  
}