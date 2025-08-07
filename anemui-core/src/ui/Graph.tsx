import { createElement } from "tsx-create-element";
import { BaseApp } from "../BaseApp";
import { BaseFrame } from "./BaseFrame";
import Dygraph, { dygraphs } from 'dygraphs';
import { dateText } from "../data/CsPConstans";
import { CsLatLongData } from "../data/CsDataTypes";
import { CsLatLong } from '../CsMapTypes';

require("dygraphs/dist/dygraph.css")

export type GraphType = "Serial" | "Area" | "Linear" | "Cummulative" | "MgFr" | "WindRose"

export class CsGraph extends BaseFrame {
  private graphTitle: string;
  private graphSubTitle: string;
  private yLabel: string;
  private xLabel: string; 
  private graphType: GraphType;
  public byPoint: boolean;
  public scaleSelectors: boolean;
  public stationProps: any = []

  private downloadButtonContainer: HTMLButtonElement;
  private featureButtonContainer: HTMLButtonElement;

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
            <div className="popup-content" style={{ width: "auto" }}>
              <div id="popGraph" style={{ height: graphHeight + "px", width: graphWidth + "px" }}></div>
            </div>
            <div className="labels-content" style={{ width: "auto" }}>
              <div id="labels" style={{ width: graphWidth + "px" }}></div>
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
      case "MgFr":
        this.graphTitle += ": " + this.parent.getTranslation('modelo_mg_fr');
        break;
    }
  }

  public setParams(_title: string, _type: GraphType, _byPoint: boolean, _scaleSelectors?: boolean, _xLabel: string = '', _yLabel: string = '') {
    this.graphTitle = _title;
    this.graphType = _type;
    this.byPoint = _byPoint;
    this.scaleSelectors = _scaleSelectors;
    this.xLabel = _xLabel;
    this.yLabel = _yLabel;
  }

  public closeGraph() {
    this.container.hidden = true
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
    }
    // if (this.scaleSelectors) this.addScaleSelectors(graph)
    this.parent.completeGraph(graph, data);
  }

  public drawSerialGraph(url: any, latlng: CsLatLong):Dygraph {
    let self = this
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
  
  public drawAreaGraph(url: any, latlng: CsLatLong): Dygraph {
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

  //   public drawLinearGraph(url: string, station: any): Dygraph {
  //     var graph = new Dygraph(
  //         document.getElementById("popGraph"),
  //         url,
  //         {
  //             labelsDiv: document.getElementById('labels'),
  //             digitsAfterDecimal: 1,
  //             title: this.graphTitle + this.graphSubTitle,
  //             ylabel: this.yLabel,
  //             xlabel: this.xLabel,
  //             // Ajustar márgenes para evitar solapamiento del yLabel
  //             axes: {
  //                 y: {
  //                     axisLabelWidth: 80, // Aumentar el ancho reservado para la etiqueta del eje Y
  //                     axisLabelFontSize: 12,
  //                 },
  //                 x: {
  //                     axisLabelFontSize: 12,
  //                 }
  //             },
  //             // Márgenes del gráfico
  //             rightGap: 20,
  //             yRangePad: 10, 
  //             series: {
  //                 'fit': { 
  //                     color: "#aa3311",
  //                     strokeWidth: 2
  //                 },
  //                 'lwr': { 
  //                     color: "#454545",
  //                     strokePattern: Dygraph.DASHED_LINE
  //                 },
  //                 'upr': { 
  //                     color: "#454545",
  //                     strokePattern: Dygraph.DASHED_LINE
  //                 }
  //             },
  //         }
  //     );

  //     // this.addScaleSelectors(graph)
      
  //     return graph;
  // }

  public drawLinearGraph(url: string, station: any): Dygraph {
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
    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE SUMA ACUMULATIVA en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
  }

  public drawMgFrGraph(url: any, station: any): Dygraph {

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
    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE WIND ROSE en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
  }

//   private addScaleSelectors(graph: Dygraph): void {
//     // Buscar si ya existe el contenedor de selectores
//     let existingContainer = document.getElementById('scaleSelectorsContainer');
//     if (existingContainer) {
//         existingContainer.remove();
//     }

//     // Crear el contenedor principal
//     const mainContainer = document.createElement('div');
//     mainContainer.id = 'scaleSelectorsContainer';
    
//     // Crear selector para eje X
//     const xContainer = this.createAxisSelector('x', 'Eje X (años)');
//     mainContainer.appendChild(xContainer);
    
//     // Crear selector para eje Y
//     const yContainer = this.createAxisSelector('y', 'Eje Y (valores)');
//     mainContainer.appendChild(yContainer);
    
//     // Insertar el contenedor antes del gráfico
//     const graphContainer = document.getElementById("popGraph");
//     if (graphContainer && graphContainer.parentNode) {
//         graphContainer.parentNode.insertBefore(mainContainer, graphContainer);
//     }
    
//     // Agregar eventos para cambiar las escalas
//     this.attachScaleEvents(graph);
//   }

//   private createAxisSelector(axis: 'x' | 'y', labelText: string): HTMLElement {
//     const container = document.createElement('div');
//     container.style.display = 'flex';
//     container.style.alignItems = 'center';
//     container.style.gap = '8px';
    
//     const label = document.createElement('label');
//     label.textContent = labelText + ': ';
//     label.style.fontWeight = 'bold';
//     label.style.minWidth = '100px';
    
//     const select = document.createElement('select');
//     select.id = `${axis}ScaleSelect`;
//     select.style.padding = '4px 8px';
//     select.style.border = '1px solid #ccc';
//     select.style.borderRadius = '4px';
    
//     // Opciones del selector
//     const linearOption = document.createElement('option');
//     linearOption.value = 'linear';
//     linearOption.textContent = 'Lineal';
//     linearOption.selected = true;
    
//     const logOption = document.createElement('option');
//     logOption.value = 'logarithmic';
//     logOption.textContent = 'Logarítmica';
    
//     select.appendChild(linearOption);
//     select.appendChild(logOption);
    
//     container.appendChild(label);
//     container.appendChild(select);
    
//     return container;
//   }

//   private attachScaleEvents(graph: Dygraph): void {
//     // Evento para eje X
//     const xSelect = document.getElementById('xScaleSelect') as HTMLSelectElement;
//     if (xSelect) {
//         xSelect.addEventListener('change', (event) => {
//             const target = event.target as HTMLSelectElement;
//             const ySelect = document.getElementById('yScaleSelect') as HTMLSelectElement;
//             this.updateGraphScale(graph, target.value === 'logarithmic', ySelect?.value === 'logarithmic');
//         });
//     }
    
//     // Evento para eje Y
//     const ySelect = document.getElementById('yScaleSelect') as HTMLSelectElement;
//     if (ySelect) {
//         ySelect.addEventListener('change', (event) => {
//             const target = event.target as HTMLSelectElement;
//             const xSelect = document.getElementById('xScaleSelect') as HTMLSelectElement;
//             this.updateGraphScale(graph, xSelect?.value === 'logarithmic', target.value === 'logarithmic');
//         });
//     }
//   }

//   private updateGraphScale(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
//     // Configuración de ejes (mismo código anterior)
//     const axesOptions: any = {};
    
//     axesOptions.x = {
//         logscale: xLogScale,
//         axisLabelFontSize: 12,
//         axisLabelFormatter: (x: number | Date) => {
//             if (typeof x === 'number') {
//                 if (xLogScale) {
//                     return parseFloat(x.toFixed(1)).toString().replace('.', ',');
//                 }
//                 return parseFloat(x.toFixed(1)).toString().replace('.', ',');
//             }
//             return (x as Date).toLocaleDateString();
//         }
//     };
    
//     axesOptions.y = {
//         logscale: yLogScale,
//         axisLabelWidth: 80,
//         axisLabelFontSize: 12,
//         axisLabelFormatter: (y: number | Date) => {
//             if (typeof y === 'number') {
//                 if (yLogScale) {
//                     if (Math.abs(y) >= 1000000 || (Math.abs(y) < 0.001 && y !== 0)) {
//                         return y.toExponential(2);
//                     }
//                     return parseFloat(y.toFixed(1)).toString().replace('.', ',');
//                 }
//                 return parseFloat(y.toFixed(1)).toString().replace('.', ',');
//             }
//             return (y as Date).toLocaleDateString();
//         }
//     };
    
//     // Obtener punto personalizado y callback del manager
//     const pointManager = GraphPointManager.getInstance();
//     const customPoint = pointManager.getCustomPoint();
//     const drawCallback = pointManager.getDrawCallback();
    
//     const updateOptions: any = {
//         axes: axesOptions,
//         valueFormatter: (num: number | Date) => {
//             if (typeof num === 'number') {
//                 if (yLogScale && Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
//                     return num.toExponential(2);
//                 }
//                 return parseFloat(num.toFixed(3)).toString().replace('.', ',');
//             }
//             return (num as Date).toLocaleDateString();
//         }
//     };
    
//     // Si existe un punto personalizado, recrear el underlayCallback
//     if (customPoint && drawCallback) {
//         updateOptions.underlayCallback = function(canvas: CanvasRenderingContext2D, area: any, dygraph: Dygraph) {
//             setTimeout(() => {
//                 drawCallback(canvas, area, dygraph, customPoint);
//             }, 1);
//         };
//     }
    
//     graph.updateOptions(updateOptions);
// }

  // private updateGraphScale(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
  //   // Configurar las opciones de los ejes
  //   const axesOptions: any = {};
    
  //   // Configuración eje X
  //   axesOptions.x = {
  //       logscale: xLogScale,
  //       valueFormatter: (num: number, opts: any, seriesName: string, dygraph: any, row: number, col: number) => {
  //           if (xLogScale) {
  //               // Para escala logarítmica en X, mostrar años como enteros
  //               return Math.round(num).toString();
  //           }
  //           return Math.round(num).toString();
  //       }
  //   };
    
  //   // Configuración eje Y
  //   axesOptions.y = {
  //       logscale: yLogScale,
  //       valueFormatter: (num: number, opts: any, seriesName: string, dygraph: any, row: number, col: number) => {
  //           if (yLogScale) {
  //               // Formato para escala logarítmica en Y
  //               if (Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
  //                   return num.toExponential(2);
  //               }
  //               return num.toFixed(3);
  //           }
  //           return num.toFixed(3);
  //       }
  //   };
    
  //   // Actualizar el gráfico
  //   graph.updateOptions({
  //       axes: axesOptions,
  //       // Formatter global para la tabla de valores
  //       valueFormatter: (num: number, opts: any, seriesName: string, dygraph: any, row: number, col: number) => {
  //           if (seriesName === 'years') {
  //               return Math.round(num).toString();
  //           }
            
  //           // Usar formato apropiado según si Y está en escala log
  //           if (yLogScale) {
  //               if (Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
  //                   return num.toExponential(2);
  //               }
  //               return num.toFixed(3);
  //           }
  //           return num.toFixed(3);
  //       }
  //   });
  // }

  
  // private updateGraphScale(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
  //   // Configurar las opciones de los ejes
  //   const axesOptions: any = {};
    
  //   // Configuración eje X
  //   axesOptions.x = {
  //       logscale: xLogScale,
  //       axisLabelFontSize: 12,
  //       axisLabelFormatter: (x: number | Date) => {
  //           if (typeof x === 'number') {
  //               if (xLogScale) {
  //                   // Para escala logarítmica en X, mostrar años con más precisión
  //                   return parseFloat(x.toFixed(1)).toString().replace('.', ',');
  //               }
  //               return parseFloat(x.toFixed(1)).toString().replace('.', ',');
  //           }
  //           return (x as Date).toLocaleDateString();
  //       }
  //   };
    
  //   // Configuración eje Y
  //   axesOptions.y = {
  //       logscale: yLogScale,
  //       axisLabelWidth: 80,
  //       axisLabelFontSize: 12,
  //       axisLabelFormatter: (y: number | Date) => {
  //           if (typeof y === 'number') {
  //               if (yLogScale) {
  //                   // Formato para escala logarítmica en Y
  //                   if (Math.abs(y) >= 1000000 || (Math.abs(y) < 0.001 && y !== 0)) {
  //                       return y.toExponential(2);
  //                   }
  //                   return parseFloat(y.toFixed(1)).toString().replace('.', ',');
  //               }
  //               return parseFloat(y.toFixed(1)).toString().replace('.', ',');
  //           }
  //           return (y as Date).toLocaleDateString();
  //       }
  //   };
    
    // Actualizar el gráfico
  //   graph.updateOptions({
  //       axes: axesOptions,
  //       // Formatter global para tooltips y leyendas
  //       valueFormatter: (num: number | Date) => {
  //           if (typeof num === 'number') {
  //               // Usar formato apropiado según si Y está en escala log
  //               if (yLogScale && Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
  //                   return num.toExponential(2);
  //               }
  //               return parseFloat(num.toFixed(3)).toString().replace('.', ',');
  //           }
  //           return (num as Date).toLocaleDateString();
  //       }
  //   });
    
  //   // IMPORTANTE: Forzar el redibujado del gráfico para que se actualice el punto personalizado
  //   graph.resize();
  // }

//   private customPointData: {x: number, y: number} | null = null;
//   private currentGraph: Dygraph | null = null;

//   private updateGraphScale(graph: Dygraph, xLogScale: boolean, yLogScale: boolean): void {
//     // Configurar las opciones de los ejes
//     const axesOptions: any = {};
    
//     // Configuración eje X
//     axesOptions.x = {
//         logscale: xLogScale,
//         axisLabelFontSize: 12,
//         axisLabelFormatter: (x: number | Date) => {
//             if (typeof x === 'number') {
//                 if (xLogScale) {
//                     // Para escala logarítmica en X, mostrar años con más precisión
//                     return parseFloat(x.toFixed(1)).toString().replace('.', ',');
//                 }
//                 return parseFloat(x.toFixed(1)).toString().replace('.', ',');
//             }
//             return (x as Date).toLocaleDateString();
//         }
//     };
    
//     // Configuración eje Y
//     axesOptions.y = {
//         logscale: yLogScale,
//         axisLabelWidth: 80,
//         axisLabelFontSize: 12,
//         axisLabelFormatter: (y: number | Date) => {
//             if (typeof y === 'number') {
//                 if (yLogScale) {
//                     // Formato para escala logarítmica en Y
//                     if (Math.abs(y) >= 1000000 || (Math.abs(y) < 0.001 && y !== 0)) {
//                         return y.toExponential(2);
//                     }
//                     return parseFloat(y.toFixed(1)).toString().replace('.', ',');
//                 }
//                 return parseFloat(y.toFixed(1)).toString().replace('.', ',');
//             }
//             return (y as Date).toLocaleDateString();
//         }
//     };
    
//     // Actualizar el gráfico
//     graph.updateOptions({
//         axes: axesOptions,
//         // Formatter global para tooltips y leyendas
//         valueFormatter: (num: number | Date) => {
//             if (typeof num === 'number') {
//                 // Usar formato apropiado según si Y está en escala log
//                 if (yLogScale && Math.abs(num) >= 1000000 || (Math.abs(num) < 0.001 && num !== 0)) {
//                     return num.toExponential(2);
//                 }
//                 return parseFloat(num.toFixed(3)).toString().replace('.', ',');
//             }
//             return (num as Date).toLocaleDateString();
//         }
//     });
    
//     // SOLUCIÓN ALTERNATIVA: Usar requestAnimationFrame para asegurar el redibujado
//     // Esto permite que Dygraph complete todos sus cálculos internos antes del redibujado
//     requestAnimationFrame(() => {
//         // Forzar redibujado completo
//         graph.resize();
        
//         // Como alternativa adicional, también puedes forzar un evento de redimensionado
//         // que hace que Dygraph recalcule todas las coordenadas
//         const resizeEvent = new Event('resize');
//         window.dispatchEvent(resizeEvent);
//     });
// }



  // Versión alternativa con checkboxes en lugar de dropdowns
  private createScaleSelectorsCheckbox(graph: Dygraph): void {
    let existingContainer = document.getElementById('scaleSelectorsContainer');
    if (existingContainer) {
        existingContainer.remove();
    }

    const mainContainer = document.createElement('div');
    mainContainer.id = 'scaleSelectorsContainer';
    mainContainer.style.margin = '10px 0';
    mainContainer.style.display = 'flex';
    mainContainer.style.gap = '20px';
    mainContainer.style.flexWrap = 'wrap';
    
    // Checkbox para eje X
    const xContainer = document.createElement('div');
    xContainer.style.display = 'flex';
    xContainer.style.alignItems = 'center';
    xContainer.style.gap = '8px';
    
    const xCheckbox = document.createElement('input');
    xCheckbox.type = 'checkbox';
    xCheckbox.id = 'xLogScaleCheckbox';
    
    const xLabel = document.createElement('label');
    xLabel.htmlFor = 'xLogScaleCheckbox';
    xLabel.textContent = 'Escala logarítmica Eje X (años)';
    xLabel.style.cursor = 'pointer';
    xLabel.style.userSelect = 'none';
    
    xContainer.appendChild(xCheckbox);
    xContainer.appendChild(xLabel);
    
    // Checkbox para eje Y
    const yContainer = document.createElement('div');
    yContainer.style.display = 'flex';
    yContainer.style.alignItems = 'center';
    yContainer.style.gap = '8px';
    
    const yCheckbox = document.createElement('input');
    yCheckbox.type = 'checkbox';
    yCheckbox.id = 'yLogScaleCheckbox';
    
    const yLabel = document.createElement('label');
    yLabel.htmlFor = 'yLogScaleCheckbox';
    yLabel.textContent = 'Escala logarítmica Eje Y (valores)';
    yLabel.style.cursor = 'pointer';
    yLabel.style.userSelect = 'none';
    
    yContainer.appendChild(yCheckbox);
    yContainer.appendChild(yLabel);
    
    mainContainer.appendChild(xContainer);
    mainContainer.appendChild(yContainer);
    
    const graphContainer = document.getElementById("popGraph");
    if (graphContainer && graphContainer.parentNode) {
        graphContainer.parentNode.insertBefore(mainContainer, graphContainer);
    }
    
    // Eventos para los checkboxes
    xCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        // this.updateGraphScale(graph, target.checked, yCheckbox.checked);
    });
    
    yCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        // this.updateGraphScale(graph, xCheckbox.checked, target.checked);
    });
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