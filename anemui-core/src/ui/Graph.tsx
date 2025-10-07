import { createElement } from "tsx-create-element";
import { BaseApp } from "../BaseApp";
import { BaseFrame } from "./BaseFrame";
import Dygraph, { dygraphs } from 'dygraphs';
import { dateText } from "../data/CsPConstans";
import { CsLatLongData } from "../data/CsDataTypes";
import { CsLatLong } from '../CsMapTypes';

require("dygraphs/dist/dygraph.css")

export type GraphType = "Serial" | "Area" | "Linear" | "Cummulative" | "MgFr" | "WindRose" | "Bar" | "StackedBar" | "LineWithTooltip"

export class CsGraph extends BaseFrame {
  private graphTitle: string;
  private graphSubTitle: string;
  private yLabel: string;
  private xLabel: string;
  private graphType: GraphType;
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

  public constructor(_parent: BaseApp) {
    super(_parent)
  }

  public render(): JSX.Element {
    let self = this;
    let graphWidth = screen.width > 1200 ? screen.width * 0.4 : screen.width * 0.55;
    let graphHeight = screen.height > 1200 ? screen.height * 0.4 : screen.height * 0.50;
    let element =
      (<div className="container">
        <div id="GraphContainer" className='GraphContainer row' hidden >
          <div className="popup-content-wrapper col">
            <div className="popup-content" style={{ width: "auto", position: "relative" }}>
              <div id="popGraph" style={{ height: graphHeight + "px", width: graphWidth + "px" }}></div>
              <div id="graphTooltip" style={{
                position: "absolute",
                display: "none",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "8px 12px",
                borderRadius: "4px",
                pointerEvents: "none",
                fontSize: "12px",
                zIndex: 1000,
                whiteSpace: "nowrap"
              }}></div>
            </div>
            <div className="labels-content" style={{ width: "auto" }}>
              <div id="labels" style={{ width: graphWidth + "px" }}></div>
            </div>
            <div id="colorLegend" style={{ display: "none", padding: "8px 5px", justifyContent: "center", alignItems: "center", gap: "3px", flexWrap: "wrap", fontSize: "11px" }}>
              <span style={{ fontWeight: "bold", marginRight: "5px", whiteSpace: "nowrap" }}>Superficie afectada:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#ffcccc" }}></div><span style={{ whiteSpace: "nowrap" }}>0-10%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#ff9999" }}></div><span style={{ whiteSpace: "nowrap" }}>10-20%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#ff6666" }}></div><span style={{ whiteSpace: "nowrap" }}>20-30%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#ff3333" }}></div><span style={{ whiteSpace: "nowrap" }}>30-40%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#ff0000" }}></div><span style={{ whiteSpace: "nowrap" }}>40-50%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#cc0000" }}></div><span style={{ whiteSpace: "nowrap" }}>50-60%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#990000" }}></div><span style={{ whiteSpace: "nowrap" }}>60-70%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#660000" }}></div><span style={{ whiteSpace: "nowrap" }}>70-80%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#4d0000" }}></div><span style={{ whiteSpace: "nowrap" }}>80-90%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "18px", height: "12px", backgroundColor: "#330000" }}></div><span style={{ whiteSpace: "nowrap" }}>90-100%</span></div>
            </div>
            <div id="graphControls" className="graph-controls" hidden style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "10px", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label htmlFor="viewModeSelector" style={{ fontWeight: "bold" }}>Vista:</label>
                <select id="viewModeSelector" className="form-select" style={{ width: "auto" }} onChange={() => { this.changeViewMode() }}>
                  <option value="monthly">Por meses</option>
                  <option value="full">Serie completa</option>
                </select>
              </div>
              <div id="yearPagination" className="year-pagination" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <button type="button" id="prevYearBtn" className="btn navbar-btn" onClick={() => { this.previousYear() }}>← Año anterior</button>
                <span id="currentYearLabel" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Año: </span>
                <button type="button" id="nextYearBtn" className="btn navbar-btn" onClick={() => { this.nextYear() }}>Año siguiente →</button>
              </div>
            </div>
            <div id="graphDiv" className="droppDownButton">
              <button type="button" role="dropPointBtn" className="btn navbar-btn" onClick={() => { this.parent.downloadPoint() }}>{this.parent.getTranslation('descargar_pixel')}</button>
              <button type="button" role="dropFeatureBtn" className="btn navbar-btn" hidden onClick={() => { this.parent.downloadFeature(this.stationProps) }}>{this.parent.getTranslation('descargar_pixel')}</button>
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
    switch (this.graphType) {
      case "Serial":
      case "Area":
        this.graphTitle += ": " + this.parent.getTranslation('serie_temporal');
        break;
      case "Cummulative":
        this.graphTitle += ": " + this.parent.getTranslation('modelo_lineal');
        break;
      case "Linear":
      case "MgFr":
        this.graphTitle += ": " + this.parent.getTranslation('modelo_mg_fr');
        break;
      case "Bar":
        this.graphTitle += ": " + this.parent.getTranslation('grafico_barras');
        break;
    }
  }

  public setParams(_title: string, _type: GraphType, _byPoint: boolean, _scaleSelectors?: boolean, _xLabel: string = '', _yLabel: string = '') {
    // this.graphTitle = _title;
    this.graphType = _type;
    switch (this.graphType) {
      case "Serial":
      case "Area":
        case "Bar":  
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
    this.graphSubTitle = station.length != 0? ' - ' + station['name'] : ' ' + latlng.lat.toFixed(2) + ' N , ' + latlng.lng.toFixed(2) + ' E', 
    this.container.hidden = false;
    if (Object.keys(station).length != 0)  this.enableStationDwButton(station)
    else this.disableStationDwButton()
    
    let graph: Dygraph
    let url

    switch (this.graphType) {
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
      case "Bar":
        graph = this.drawBarGraph(data, latlng);
        break;
      case "StackedBar":
        graph = this.drawStackedBarGraph(data, latlng);
        break;
      case "LineWithTooltip":
        graph = this.drawLineWithTooltipGraph(data, latlng);
        break;
    }
    // if (this.scaleSelectors) this.addScaleSelectors(graph)
    this.parent.completeGraph(graph, data);
  }

  public drawSerialGraph(url: any, latlng: CsLatLong):Dygraph {
    let self = this

    // Ocultar leyenda de colores (no se usa en Serial)
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
        ylabel: this.parent.getState().legendTitle,
        xlabel: dateText,
        showRangeSelector: true,
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
              let fecha = new Date(millis);
              let value = self.formatDate(fecha)
              return value;

            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              var fecha = new Date(number);
              let value = self.formatDate(fecha)
              return value;
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

  public drawBarGraph(url: any, latlng: CsLatLong): Dygraph {
    let self = this

    // Ocultar leyenda de colores (no se usa en Bar)
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
        ylabel: this.parent.getState().legendTitle,
        xlabel: dateText,
        showRangeSelector: true,

        // Configuración específica para gráfico de barras
        plotter: function (e: any) {
          let ctx = e.drawingContext;
          let area = e.plotArea;

          // Configurar estilo de las barras
          ctx.fillStyle = "#4285F4"; // Color azul para las barras
          ctx.strokeStyle = "#1a73e8"; // Color del borde
          ctx.lineWidth = 1;

          // Calcular ancho de cada barra
          let barWidth = Math.max(1, (area.w / e.points.length) * 0.8); // 80% del espacio disponible

          // Dibujar las barras
          for (let i = 0; i < e.points.length; i++) {
            let point = e.points[i];
            if (!isNaN(point.yval) && point.yval !== null) {
              // Calcular posición y altura de la barra
              let barHeight = Math.abs(point.canvasy - area.y - area.h);
              let barX = point.canvasx - barWidth / 2;
              let barY = Math.min(point.canvasy, area.y + area.h);

              // Dibujar la barra
              ctx.fillRect(barX, barY, barWidth, barHeight);
              ctx.strokeRect(barX, barY, barWidth, barHeight);
            }
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
              let fecha = new Date(millis);
              let value = self.formatDate(fecha)
              return value;
            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              var fecha = new Date(number);
              let value = self.formatDate(fecha)
              return value;
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

  private previousYear(): void {
    if (this.currentYear > 0) {
      this.currentYear--;
      this.updateGraphForYear();
    }
  }

  private nextYear(): void {
    if (this.currentYear < this.totalYears - 1) {
      this.currentYear++;
      this.updateGraphForYear();
    }
  }

  private updateColorLegend(): void {
    const legendDiv = document.getElementById('colorLegend');
    if (!legendDiv) return;

    const colors = this.waveType === "cold"
      ? ['#d9fff8', '#bbdfe1', '#9dbeca', '#7f9eb3', '#627e9d', '#445e86', '#263d6f', '#1a2d58', '#112542', '#081D58']
      : ['#ffcccc', '#ff9999', '#ff6666', '#ff3333', '#ff0000', '#cc0000', '#990000', '#660000', '#4d0000', '#330000'];

    legendDiv.innerHTML = `
      <span style="font-weight: bold; margin-right: 5px; white-space: nowrap;">Superficie afectada:</span>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[0]};"></div><span style="white-space: nowrap;">0-10%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[1]};"></div><span style="white-space: nowrap;">10-20%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[2]};"></div><span style="white-space: nowrap;">20-30%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[3]};"></div><span style="white-space: nowrap;">30-40%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[4]};"></div><span style="white-space: nowrap;">40-50%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[5]};"></div><span style="white-space: nowrap;">50-60%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[6]};"></div><span style="white-space: nowrap;">60-70%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[7]};"></div><span style="white-space: nowrap;">70-80%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[8]};"></div><span style="white-space: nowrap;">80-90%</span></div>
      <div style="display: flex; align-items: center; gap: 2px;"><div style="width: 18px; height: 12px; background-color: ${colors[9]};"></div><span style="white-space: nowrap;">90-100%</span></div>
    `;
  }

  private changeViewMode(): void {
    const selector = document.getElementById('viewModeSelector') as HTMLSelectElement;
    if (!selector) return;

    const mode = selector.value;
    const paginationDiv = document.getElementById('yearPagination');
    const legendDiv = document.getElementById('colorLegend');

    if (mode === 'full') {
      // Vista completa: ocultar paginación, mostrar leyenda y mostrar todos los años
      if (paginationDiv) {
        paginationDiv.style.display = 'none';
      }
      if (legendDiv) {
        legendDiv.style.display = 'flex';
      }
      this.showFullSeriesView();
    } else {
      // Vista por meses: mostrar paginación, mostrar leyenda y restaurar gráfico de puntos
      if (paginationDiv) {
        paginationDiv.style.display = 'flex';
      }
      if (legendDiv) {
        legendDiv.style.display = 'flex'; // Mostrar leyenda también en vista mensual
      }
      this.showMonthlyView();
    }
  }

  private showMonthlyView(): void {
    if (!this.currentGraph) return;

    // Restaurar vista mensual con puntos coloreados por superficie
    this.updateGraphForYear();

    const self = this;

    // Función para obtener color según superficie afectada (0-100) y tipo de ola
    const getColorBySurface = (surface: number): string => {
      if (self.waveType === "cold") {
        // Escala de azul claro a azul oscuro para olas de frío
        if (surface < 10) return '#d9fff8';
        else if (surface < 20) return '#bbdfe1';
        else if (surface < 30) return '#9dbeca';
        else if (surface < 40) return '#7f9eb3';
        else if (surface < 50) return '#627e9d';
        else if (surface < 60) return '#445e86';
        else if (surface < 70) return '#263d6f';
        else if (surface < 80) return '#1a2d58';
        else if (surface < 90) return '#112542';
        else return '#081D58';
      } else {
        // Escala de rojo claro a rojo burdeos para olas de calor
        if (surface < 10) return '#ffcccc';
        else if (surface < 20) return '#ff9999';
        else if (surface < 30) return '#ff6666';
        else if (surface < 40) return '#ff3333';
        else if (surface < 50) return '#ff0000';
        else if (surface < 60) return '#cc0000';
        else if (surface < 70) return '#990000';
        else if (surface < 80) return '#660000';
        else if (surface < 90) return '#4d0000';
        else return '#330000';
      }
    };
    this.currentGraph.updateOptions({
      drawPoints: false,
      strokeWidth: 0,
      fillGraph: false,
      visibility: [true, false, false, false], // Mostrar extreme, ocultar surface, duration y event

      // CÓDIGO COMENTADO - Configuración para línea con área coloreada
      // plotter: null, // Restaurar el plotter por defecto (líneas)
      // strokeWidth: 2,
      // fillGraph: true,
      // fillAlpha: 0.3,

      // Plotter para puntos coloreados por superficie con sombreado de fondo
      plotter: function(e: any) {
        if (e.setName !== 'extreme') return;

        const ctx = e.drawingContext;
        const points = e.points;
        const radius = 3;

        ctx.save();

        // Primero, dibujar el sombreado de fondo para las fechas con ola
        // Color según el tipo: amarillo para calor, gris claro para frío
        ctx.fillStyle = self.waveType === "cold" ? 'rgba(200, 200, 200, 0.2)' : 'rgba(255, 255, 0, 0.2)';

        let inWave = false;
        let startX = 0;

        for (let i = 0; i < points.length; i++) {
          const extremeValue = e.dygraph.getValue(i, 1); // Columna 1 es extreme
          const isWave = extremeValue > 0 || extremeValue < 0; // Detectar si hay ola (valores != 0)

          if (isWave && !inWave) {
            // Inicio de ola
            startX = i > 0 ? points[i - 1].canvasx + (points[i].canvasx - points[i - 1].canvasx) / 2 : points[i].canvasx;
            inWave = true;
          } else if (!isWave && inWave) {
            // Fin de ola
            const endX = i > 0 ? points[i - 1].canvasx + (points[i].canvasx - points[i - 1].canvasx) / 2 : points[i].canvasx;
            ctx.fillRect(startX, e.plotArea.y, endX - startX, e.plotArea.h);
            inWave = false;
          }
        }

        // Si terminamos en una ola, dibujar hasta el final
        if (inWave && points.length > 0) {
          const lastPoint = points[points.length - 1];
          ctx.fillRect(startX, e.plotArea.y, lastPoint.canvasx - startX, e.plotArea.h);
        }

        // Luego, dibujar los puntos encima del sombreado
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const surfaceValue = e.dygraph.getValue(i, 2);
          const pointColor = getColorBySurface(surfaceValue);

          ctx.beginPath();
          ctx.fillStyle = pointColor;
          ctx.arc(point.canvasx, point.canvasy, radius, 0, 2 * Math.PI, false);
          ctx.fill();
        }

        ctx.restore();
      },

      series: {
        'extreme': {
          color: '#ff6b6b',
          strokeWidth: 0,
          fillGraph: false,
          drawPoints: false
        }
      },
      axes: {
        x: {
          valueFormatter: function (millis: number) {
            let fecha = new Date(millis);
            return self.formatDate(fecha);
          },
          axisLabelFormatter: function(number: number) {
            const fecha = new Date(number);
            if (fecha.getDate() === 1 || fecha.getDate() === 1) {
              return self.parent.getMonthName(fecha.getMonth(), true);
            }
            return '';
          },
          pixelsPerLabel: 50
        }
      }
    });
  }

  private showFullSeriesView(): void {
    if (!this.currentGraph || !this.fullData) return;

    // Usar todos los datos sin agregar (todos los días de todos los años)
    const fullSeriesData = this.fullData;

    const self = this;

    // Función para obtener color según superficie afectada (0-100) y tipo de ola
    const getColorBySurface = (surface: number): string => {
      if (self.waveType === "cold") {
        // Escala de azul claro a azul oscuro para olas de frío
        if (surface < 10) return '#d9fff8';
        else if (surface < 20) return '#bbdfe1';
        else if (surface < 30) return '#9dbeca';
        else if (surface < 40) return '#7f9eb3';
        else if (surface < 50) return '#627e9d';
        else if (surface < 60) return '#445e86';
        else if (surface < 70) return '#263d6f';
        else if (surface < 80) return '#1a2d58';
        else if (surface < 90) return '#112542';
        else return '#081D58';
      } else {
        // Escala de rojo claro a rojo burdeos para olas de calor
        if (surface < 10) return '#ffcccc';
        else if (surface < 20) return '#ff9999';
        else if (surface < 30) return '#ff6666';
        else if (surface < 40) return '#ff3333';
        else if (surface < 50) return '#ff0000';
        else if (surface < 60) return '#cc0000';
        else if (surface < 70) return '#990000';
        else if (surface < 80) return '#660000';
        else if (surface < 90) return '#4d0000';
        else return '#330000';
      }
    };

    // Actualizar gráfico con vista completa
    this.currentGraph.updateOptions({
      file: fullSeriesData,
      drawPoints: false, // Desactivar puntos por defecto, usaremos plotter personalizado
      pointSize: 3,
      highlightCircleSize: 5,
      strokeWidth: 0, // Sin línea, solo puntos
      fillGraph: false,
      fillAlpha: 0,
      visibility: [true, false, false, false], // Mostrar extreme, ocultar surface, duration y event
      series: {
        'extreme': {
          fillGraph: false,
          strokeWidth: 0,
          drawPoints: false
        }
      },
      plotter: function(e: any) {
        // Solo dibujar para la serie 'extreme'
        if (e.setName !== 'extreme') return;

        const ctx = e.drawingContext;
        const points = e.points;
        const radius = 3;

        ctx.save();

        for (let i = 0; i < points.length; i++) {
          const point = points[i];

          // Obtener el valor de superficie (columna 2) para este punto
          const surfaceValue = e.dygraph.getValue(i, 2);

          // Obtener el color según la superficie
          const pointColor = getColorBySurface(surfaceValue);

          // Dibujar el punto
          ctx.beginPath();
          ctx.fillStyle = pointColor;
          ctx.arc(point.canvasx, point.canvasy, radius, 0, 2 * Math.PI, false);
          ctx.fill();
        }

        ctx.restore();
      },
      axes: {
        x: {
          valueFormatter: (millis: number) => {
            const fecha = new Date(millis);
            return fecha.getFullYear().toString();
          },
          axisLabelFormatter: (number: number) => {
            const fecha = new Date(number);
            return fecha.getFullYear().toString();
          },
          pixelsPerLabel: 80
        }
      }
    });
  }

  private createCompleteYearData(dataLines: string[], targetYear: number, header: string): string {
    // Crear un mapa de fecha -> datos
    const dataMap = new Map<string, { extreme: string, surface: string, duration: string, event: string }>();

    dataLines.forEach(line => {
      if (line.trim()) {
        const parts = line.split(',');
        const date = parts[0];
        const year = parseInt(date.split('-')[0]);

        if (year === targetYear) {
          dataMap.set(date, {
            extreme: parts[1],
            surface: parts[2],
            duration: parts[3] || '0',
            event: parts[4] || '0'
          });
        }
      }
    });

    // Generar todas las fechas del año (365 o 366 días)
    const isLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    const completeData: string[] = [header];

    for (let day = 1; day <= daysInYear; day++) {
      const date = new Date(targetYear, 0, day);
      const dateStr = date.toISOString().split('T')[0];

      if (dataMap.has(dateStr)) {
        const data = dataMap.get(dateStr)!;
        completeData.push(`${dateStr},${data.extreme},${data.surface},${data.duration},${data.event}`);
      } else {
        // Rellenar con valores 0 para días sin datos
        completeData.push(`${dateStr},0,0,0,0`);
      }
    }

    return completeData.join('\n');
  }

  private updateGraphForYear(): void {
    // Filtrar datos por año
    const lines = this.fullData.split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);

    // Obtener años disponibles
    const years = new Set<number>();
    dataLines.forEach(line => {
      if (line.trim()) {
        const date = line.split(',')[0];
        const year = parseInt(date.split('-')[0]);
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const targetYear = sortedYears[this.currentYear];

    // Crear datos completos para el año (365 días)
    const yearData = this.createCompleteYearData(dataLines, targetYear, header);

    // Actualizar label
    const yearLabel = document.getElementById('currentYearLabel');
    if (yearLabel) {
      yearLabel.textContent = `Año: ${targetYear}`;
    }

    // Actualizar botones
    const prevBtn = document.getElementById('prevYearBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextYearBtn') as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = this.currentYear === 0;
    if (nextBtn) nextBtn.disabled = this.currentYear === this.totalYears - 1;

    // Redibujar gráfico
    if (this.currentGraph) {
      this.currentGraph.updateOptions({ file: yearData });
    }
  }

  public drawStackedBarGraph(url: any, latlng: CsLatLong): Dygraph {
    let self = this;

    // Ocultar leyenda de colores (no se usa en StackedBar)
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'none';
    }

    // Guardar datos completos para paginación
    this.fullData = url;

    // Calcular años disponibles
    const lines = url.split('\n');
    const dataLines = lines.slice(1);
    const years = new Set<number>();
    dataLines.forEach((line: string) => {
      if (line.trim()) {
        const date = line.split(',')[0];
        const year = parseInt(date.split('-')[0]);
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    this.totalYears = sortedYears.length;
    this.currentYear = this.totalYears - 1; // Empezar por el último año

    // Crear datos completos para el último año (365 días)
    const lastYear = sortedYears[this.currentYear];
    const yearData = this.createCompleteYearData(dataLines, lastYear, lines[0]);

    // Mostrar controles de paginación
    const paginationDiv = document.getElementById('yearPagination');
    if (paginationDiv) {
      paginationDiv.hidden = false;
    }

    // Actualizar label inicial
    const yearLabel = document.getElementById('currentYearLabel');
    if (yearLabel) {
      yearLabel.textContent = `Año: ${lastYear}`;
    }

    // Actualizar estado inicial de botones
    const prevBtn = document.getElementById('prevYearBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextYearBtn') as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = true; // Deshabilitar "siguiente" porque estamos en el último año

    var graph = new Dygraph(
      document.getElementById("popGraph"),
      yearData,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 2,
        delimiter: ",",
        title: "Histórico de olas de calor",
        ylabel: this.yLabel || "Valor",
        xlabel: "",
        xAxisHeight: 20,
        showRangeSelector: true,
        stackedGraph: false,

        // Formatear la leyenda para mostrar ambos valores en columnas
        legend: 'never',

        highlightCallback: function(event: any, x: any, points: any, row: any) {
          const tooltip = document.getElementById('graphTooltip');
          if (!tooltip || points.length === 0) return;

          // Obtener valores de extreme y surface
          const extremeValue = points[0].yval;
          const surfaceValue = points.length > 1 ? points[1].yval : 0;

          // Formatear la fecha
          const date = new Date(x);
          const dateStr = self.formatDate(date);

          // Crear contenido del tooltip
          tooltip.innerHTML = `
            <div><strong>${dateStr}</strong></div>
            <div style="color: #ff6b6b;">● Extreme: ${extremeValue.toFixed(2)}</div>
            <div style="color: #4ecdc4;">● Surface: ${surfaceValue.toFixed(2)}</div>
          `;

          // Posicionar tooltip
          const canvas = document.getElementById('popGraph');
          if (canvas && event) {
            const rect = canvas.getBoundingClientRect();
            tooltip.style.left = (event.pageX - rect.left + 10) + 'px';
            tooltip.style.top = (event.pageY - rect.top - 30) + 'px';
            tooltip.style.display = 'block';
          }
        },

        unhighlightCallback: function() {
          const tooltip = document.getElementById('graphTooltip');
          if (tooltip) {
            tooltip.style.display = 'none';
          }
        },

        // Plotter personalizado para dos barras independientes lado a lado
        plotter: [
          function (e: any) {
            // Solo dibujar cuando procesamos la primera serie
            if (e.setName !== e.dygraph.getLabels()[1]) {
              return; // No hacer nada para la segunda serie
            }

            let ctx = e.drawingContext;
            let area = e.plotArea;

            // Colores para extreme y surface
            const extremeColor = "#ff6b6b"; // Rojo para extreme
            const surfaceColor = "#4ecdc4"; // Turquesa para surface

            // Calcular ancho de cada barra (dividido en 2 para las dos barras)
            let totalBarWidth = Math.max(4, (area.w / e.points.length) * 0.6);
            let barWidth = totalBarWidth / 2 - 1;
            let barGap = 2;

            ctx.save();

            for (let i = 0; i < e.points.length; i++) {
              let point = e.points[i];

              // Obtener valores de extreme (columna 1) y surface (columna 2)
              let extremeValue = e.dygraph.getValue(i, 1);
              let surfaceValue = e.dygraph.getValue(i, 2);

              if (!isNaN(extremeValue) && extremeValue !== null &&
                  !isNaN(surfaceValue) && surfaceValue !== null) {

                // Calcular posiciones Y en el canvas
                let zeroY = e.dygraph.toDomYCoord(0);
                let extremeY = e.dygraph.toDomYCoord(extremeValue);
                let surfaceY = e.dygraph.toDomYCoord(surfaceValue);

                // Posición X para las dos barras (lado a lado)
                let centerX = point.canvasx;
                let leftBarX = centerX - barWidth - barGap / 2;
                let rightBarX = centerX + barGap / 2;

                // Dibujar barra de extreme (izquierda, desde 0 hasta extreme)
                let extremeHeight = zeroY - extremeY;
                if (extremeHeight > 0) {
                  ctx.fillStyle = extremeColor;
                  ctx.fillRect(leftBarX, extremeY, barWidth, extremeHeight);
                  ctx.strokeStyle = "#d63031";
                  ctx.lineWidth = 1;
                  ctx.strokeRect(leftBarX, extremeY, barWidth, extremeHeight);
                }

                // Dibujar barra de surface (derecha, desde 0 hasta surface)
                let surfaceHeight = zeroY - surfaceY;
                if (surfaceHeight > 0) {
                  ctx.fillStyle = surfaceColor;
                  ctx.fillRect(rightBarX, surfaceY, barWidth, surfaceHeight);
                  ctx.strokeStyle = "#00b894";
                  ctx.lineWidth = 1;
                  ctx.strokeRect(rightBarX, surfaceY, barWidth, surfaceHeight);
                }
              }
            }

            ctx.restore();
          }
        ],

        axes: {
          x: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              let fecha = new Date(millis);
              return self.formatDate(fecha);
            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              const fecha = new Date(number);

              // Mostrar solo el nombre del mes
              // Si es el primer día del mes, mostrar el nombre del mes
              if (fecha.getDate() === 1 || granularity === Dygraph.MONTHLY) {
                return self.parent.getMonthName(fecha.getMonth(), true);
              }
              return '';
            },
            pixelsPerLabel: 50
          },
          y: {
            valueFormatter: function (val, opts, seriesName, dygraph, row, col) {
              return " " + (val < 0.01 ? val.toFixed(3) : val.toFixed(2));
            }
          }
        }
      }
    );

    // Guardar referencia al gráfico
    this.currentGraph = graph;

    return graph;
  }

  public drawLineWithTooltipGraph(url: any, latlng: CsLatLong): Dygraph {
    let self = this;

    // Guardar datos completos para paginación
    this.fullData = url;

    // Calcular años disponibles
    const lines = url.split('\n');
    const dataLines = lines.slice(1);
    const years = new Set<number>();
    dataLines.forEach((line: string) => {
      if (line.trim()) {
        const date = line.split(',')[0];
        const year = parseInt(date.split('-')[0]);
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    this.totalYears = sortedYears.length;
    this.currentYear = this.totalYears - 1; // Empezar por el último año

    // Crear datos completos para el último año (365 días)
    const lastYear = sortedYears[this.currentYear];
    const yearData = this.createCompleteYearData(dataLines, lastYear, lines[0]);

    // Mostrar controles de gráfico
    const graphControls = document.getElementById('graphControls');
    if (graphControls) {
      graphControls.hidden = false;
    }

    // Mostrar leyenda de colores por defecto y actualizarla según el tipo de ola
    const legendDiv = document.getElementById('colorLegend');
    if (legendDiv) {
      legendDiv.style.display = 'flex';
      this.updateColorLegend();
    }

    // Asegurar que el selector esté en modo "monthly" por defecto
    const viewSelector = document.getElementById('viewModeSelector') as HTMLSelectElement;
    if (viewSelector) {
      viewSelector.value = 'monthly';
    }

    // Actualizar label inicial
    const yearLabel = document.getElementById('currentYearLabel');
    if (yearLabel) {
      yearLabel.textContent = `Año: ${lastYear}`;
    }

    // Actualizar estado inicial de botones
    const prevBtn = document.getElementById('prevYearBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextYearBtn') as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = true;

    // Función para obtener color según superficie afectada (0-100) y tipo de ola
    const getColorBySurface = (surface: number): string => {
      if (self.waveType === "cold") {
        // Escala de azul claro a azul oscuro para olas de frío
        if (surface < 10) return '#d9fff8';      // 0-10: azul muy claro
        else if (surface < 20) return '#bbdfe1'; // 10-20: azul claro
        else if (surface < 30) return '#9dbeca'; // 20-30: azul
        else if (surface < 40) return '#7f9eb3'; // 30-40: azul medio
        else if (surface < 50) return '#627e9d'; // 40-50: azul
        else if (surface < 60) return '#445e86'; // 50-60: azul oscuro
        else if (surface < 70) return '#263d6f'; // 60-70: azul más oscuro
        else if (surface < 80) return '#1a2d58'; // 70-80: azul muy oscuro
        else if (surface < 90) return '#112542'; // 80-90: azul profundo
        else return '#081D58';                   // 90-100: azul muy oscuro
      } else {
        // Escala de rojo claro a rojo burdeos para olas de calor
        if (surface < 10) return '#ffcccc';      // 0-10: rojo muy claro
        else if (surface < 20) return '#ff9999'; // 10-20: rojo claro
        else if (surface < 30) return '#ff6666'; // 20-30: rojo
        else if (surface < 40) return '#ff3333'; // 30-40: rojo medio
        else if (surface < 50) return '#ff0000'; // 40-50: rojo intenso
        else if (surface < 60) return '#cc0000'; // 50-60: rojo oscuro
        else if (surface < 70) return '#990000'; // 60-70: rojo más oscuro
        else if (surface < 80) return '#660000'; // 70-80: rojo muy oscuro
        else if (surface < 90) return '#4d0000'; // 80-90: rojo burdeos claro
        else return '#330000';                   // 90-100: rojo burdeos oscuro
      }
    };

    // Determinar el rango del eje Y según el tipo de ola
    const yAxisRange: [number, number] = self.waveType === "cold" ? [-20, 0] : [30, 50];
    const waveType: string = this.waveType === "cold"? "frío":"calor" 

    var graph = new Dygraph(
      document.getElementById("popGraph"),
      yearData,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 2,
        delimiter: ",",
        title: "Histórico de olas de " + waveType,
        ylabel: this.yLabel || "Valor",
        xlabel: "",
        xAxisHeight: 20,
        showRangeSelector: true,

        // Ocultar la serie surface, duration y event en la visualización, solo mostrar extreme
        visibility: [true, false, false, false], // Mostrar extreme, ocultar surface, duration y event

        legend: 'never',

        // Rango del eje Y según el tipo de ola
        valueRange: yAxisRange,

        highlightCallback: function(event: any, x: any, points: any, row: any, seriesName: any) {
          const tooltip = document.getElementById('graphTooltip');
          if (!tooltip || !points || points.length === 0) return;

          // Obtener el dygraph desde this (el contexto del callback)
          const dygraph = this;

          // Obtener valores de extreme, surface, duration y event desde el dygraph directamente
          const extremeValue = dygraph.getValue(row, 1); // Columna 1 es extreme
          const surfaceValue = dygraph.getValue(row, 2); // Columna 2 es surface
          const duration = dygraph.getValue(row, 3); // Columna 3 es duration (ya calculada como total)
          const eventId = dygraph.getValue(row, 4); // Columna 4 es event

          // No mostrar tooltip si no hay datos (valores = 0 o nulos)
          if (!extremeValue || extremeValue === 0) {
            tooltip.style.display = 'none';
            return;
          }

          // Formatear la fecha
          const date = new Date(x);
          const dateStr = self.formatDate(date);

          // Obtener literales traducidos
          const tempLabel = self.parent.getTranslation('temperatura');
          const surfaceLabel = self.parent.getTranslation('superficie_afectada');
          const durationLabel = self.waveType== 'cold'? self.parent.getTranslation('duracion_ola_frio'):self.parent.getTranslation('duracion_ola_calor');

          // Crear contenido del tooltip con todos los valores
          tooltip.innerHTML = `
            <div><strong>${dateStr}</strong></div>
            <div style="color: #ff6b6b;">● ${tempLabel}: ${extremeValue.toFixed(2)}</div>
            <div style="color: #4ecdc4;">● ${surfaceLabel}: ${surfaceValue.toFixed(2)}</div>
            <div style="color: #888;">● ${durationLabel}: ${duration}</div>
          `;

          // Posicionar tooltip
          const canvas = document.getElementById('popGraph');
          if (canvas && event) {
            const rect = canvas.getBoundingClientRect();
            tooltip.style.left = (event.pageX - rect.left + 10) + 'px';
            tooltip.style.top = (event.pageY - rect.top - 30) + 'px';
            tooltip.style.display = 'block';
          }
        },

        unhighlightCallback: function() {
          const tooltip = document.getElementById('graphTooltip');
          if (tooltip) {
            tooltip.style.display = 'none';
          }
        },

        // Configuración para puntos coloreados (vista por defecto)
        drawPoints: false, // Desactivar puntos por defecto, usaremos plotter
        strokeWidth: 0,
        fillGraph: false,

        // CÓDIGO COMENTADO - Configuración para línea con área coloreada
        // fillGraph: true,
        // fillAlpha: 0.3,
        // strokeWidth: 2,

        plotter: function(e: any) {
          // Solo dibujar para la serie 'extreme'
          if (e.setName !== 'extreme') return;

          const ctx = e.drawingContext;
          const points = e.points;
          const radius = 3;

          ctx.save();

          // Primero, dibujar el sombreado de fondo para las fechas con ola
          // Color según el tipo: amarillo para calor, gris claro para frío
          ctx.fillStyle = self.waveType === "cold" ? 'rgba(200, 200, 200, 0.2)' : 'rgba(255, 255, 0, 0.2)';

          let inWave = false;
          let startX = 0;

          for (let i = 0; i < points.length; i++) {
            const extremeValue = e.dygraph.getValue(i, 1); // Columna 1 es extreme
            const isWave = extremeValue > 0 || extremeValue < 0; // Detectar si hay ola (valores != 0)

            if (isWave && !inWave) {
              // Inicio de ola
              startX = i > 0 ? points[i - 1].canvasx + (points[i].canvasx - points[i - 1].canvasx) / 2 : points[i].canvasx;
              inWave = true;
            } else if (!isWave && inWave) {
              // Fin de ola
              const endX = i > 0 ? points[i - 1].canvasx + (points[i].canvasx - points[i - 1].canvasx) / 2 : points[i].canvasx;
              ctx.fillRect(startX, e.plotArea.y, endX - startX, e.plotArea.h);
              inWave = false;
            }
          }

          // Si terminamos en una ola, dibujar hasta el final
          if (inWave && points.length > 0) {
            const lastPoint = points[points.length - 1];
            ctx.fillRect(startX, e.plotArea.y, lastPoint.canvasx - startX, e.plotArea.h);
          }

          // Luego, dibujar los puntos encima del sombreado
          for (let i = 0; i < points.length; i++) {
            const point = points[i];

            // Obtener el valor de superficie (columna 2) para este punto
            const surfaceValue = e.dygraph.getValue(i, 2);

            // Obtener el color según la superficie
            const pointColor = getColorBySurface(surfaceValue);

            // Dibujar el punto
            ctx.beginPath();
            ctx.fillStyle = pointColor;
            ctx.arc(point.canvasx, point.canvasy, radius, 0, 2 * Math.PI, false);
            ctx.fill();
          }

          ctx.restore();
        },

        series: {
          'extreme': {
            color: '#ff6b6b',
            strokeWidth: 0,
            fillGraph: false,
            drawPoints: false
          },
          'surface': {
            color: '#4ecdc4',
            strokeWidth: 2
          }
        },

        axes: {
          x: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              let fecha = new Date(millis);
              return self.formatDate(fecha);
            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              const fecha = new Date(number);

              // Mostrar solo el nombre del mes
              if (fecha.getDate() === 1 || granularity === Dygraph.MONTHLY) {
                return self.parent.getMonthName(fecha.getMonth(), true);
              }
              return '';
            },
            pixelsPerLabel: 50
          },
          y: {
            valueFormatter: function (val, opts, seriesName, dygraph, row, col) {
              return " " + (val < 0.01 ? val.toFixed(3) : val.toFixed(2));
            }
          }
        }
      }
    );

    // Guardar referencia al gráfico
    this.currentGraph = graph;

    return graph;
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
        title: this.graphTitle + ' ' + latlng.lat.toFixed(2) + ' N , ' + latlng.lng.toFixed(2) + ' E',
        ylabel: this.parent.getState().legendTitle,
        xlabel: dateText,
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
                            return parseFloat(y.toFixed(1)).toString().replace('.', ',');
                        }
                        return (y as Date).toLocaleDateString();
                    }
                },
                x: {
                    axisLabelFontSize: 12,
                    // Formatear números del eje X
                    axisLabelFormatter: (x: number | Date) => {
                        if (typeof x === 'number') {
                            return parseFloat(x.toFixed(1)).toString().replace('.', ',');
                        }
                        return (x as Date).toLocaleDateString();
                    }
                }
            },
            // Formatear valores en general
            valueFormatter: (y: number | Date) => {
                if (typeof y === 'number') {
                    return parseFloat(y.toFixed(3)).toString().replace('.', ',');
                }
                return (y as Date).toLocaleDateString();
            },
            // Márgenes del gráfico
            rightGap: 20,
            yRangePad: 10,
            // Controlar la altura del eje X
            xAxisHeight: 30,
            series: {
                'fit': {
                    color: "#aa3311",
                    strokeWidth: 2
                },
                'lwr': {
                    color: "#454545",
                    strokePattern: Dygraph.DASHED_LINE
                },
                'upr': {
                    color: "#454545",
                    strokePattern: Dygraph.DASHED_LINE
                }
            },
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