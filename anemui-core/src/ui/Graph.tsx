import { createElement } from "tsx-create-element";
import { BaseApp } from "../BaseApp";
import { BaseFrame } from "./BaseFrame";
import Dygraph, { dygraphs } from 'dygraphs';
import { dateText } from "../data/CsPConstans";
import { CsLatLongData } from "../data/CsDataTypes";
import { CsLatLong } from '../CsMapTypes';

require("dygraphs/dist/dygraph.css")

export type GraphType = "Serial" | "Area" | "Linear" | "Cummulative" | "MgFr" | "WindRose"

// ---- PENDIENTE DE HACER: SUSTITUIR GRAPHTYPE POR GRAPHMODE -> UNIFICAR LA LÓGICA CON DATEFRAMEMODE 
export enum GraphMode {
  Serial,
  Area,
  Linear,
  Cummulative,
  MgFr,
  WindRose
}

export class CsGraph extends BaseFrame {
  private graphTitle: string;
  private graphType: GraphType;
  public byPoint: boolean;

  public constructor(_parent: BaseApp) {
    super(_parent)
  }

  public render(): JSX.Element {
    let self = this;
    let graphWidth = screen.width > 1200 ? screen.width * 0.4 : screen.width * 0.55;
    let graphHeight = screen.height > 1200 ? screen.height * 0.4 : screen.height * 0.50;
    let element =
      (<div id="GraphContainer" className='GraphContainer row' hidden >
        <div className="popup-content-wrapper col">
          <div className="popup-content" style={{ width: "auto" }}>
            <div id="popGraph" style={{ height: graphHeight + "px", width: graphWidth + "px" }}></div>
          </div>
          <div className="labels-content" style={{ width: "auto" }}>
            <div id="labels" style={{ width: graphWidth + "px" }}></div>
          </div>
        </div>
        <div className="col">
          <a className="popup-close-button" onClick={() => { this.closeGraph() }}>
            <i className="bi bi-x-circle-fill"></i>
          </a>
        </div>
      </div>);
    return element;
  }

  public build(): void {
    this.container = document.getElementById("GraphContainer") as HTMLDivElement
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

  public setParams(_title: string, _type: GraphType, _byPoint: boolean) {
    this.graphTitle = _title;
    this.graphType = _type;
    this.byPoint = _byPoint;
  }

  public closeGraph() {
    this.container.hidden = true
  }

  public showGraph(data: any, latlng: CsLatLong = { lat: 0.0, lng: 0.0 }, station = '') {
    //let data:any;
    //console.log("opening Graph")
    this.container.hidden = false;
    let graph: Dygraph
    let url

    switch (this.graphType) {
      case "Serial":
        var file = new Blob([data], { type: 'text/plain' });
        url = URL.createObjectURL(file);
        graph = this.drawSerialGraph(url, latlng);
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
    this.parent.completeGraph(graph);
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
        title: this.graphTitle + ' ' + this.parent.getTranslation('en_la_coordenada') + ' [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']',
        ylabel: this.parent.getState().legendTitle,
        xlabel: dateText,
        showRangeSelector: true,
        /* plotter: function (e: any) {
          let points = e.points

        }, */
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
            // pixelsPerLabel: 10,
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              let fecha = new Date(millis);
              let value = self.formatDate(fecha)
              return value;

            },
            axisLabelFormatter(number, granularity, opts, dygraph) {
              var fecha = new Date(number);
              let value = self.formatDate(fecha)
              return value;
              // return (fecha.getMonth() + 1) + "/" + fecha.getFullYear() + " ";
            }
          },
          y: {
            valueFormatter: function (millis, opts, seriesName, dygraph, row, col) {
              // return " " + millis.toFixed(2);
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
        title: this.graphTitle + ' ' + this.parent.getTranslation('en_la_coordenada')  + ' [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']',
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

          // let title = document.querySelector<HTMLElement>('.dygraph-title');
          // console.log(title.offsetHeight)
          // console.log(document.getElementsByClassName('dygraph-title')[0].style.height)

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
            // pixelsPerLabel: 10,
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

    public drawLinearGraph(url: any, station: any): Dygraph {
    var graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 3,
        title: this.graphTitle  + ' ' + this.parent.getTranslation('en_la_estacion')  + ' ' +  station['name'],
        ylabel: this.parent.getState().legendTitle,
        xlabel: dateText,
        series: {
          'value': {
            color: "#453478",
            strokeWidth: 2,
            drawPoints: true,
            pointSize: 3,
            highlightCircleSize: 4
          },
          'fit': {
            color: "#aa3311",
            strokeWidth: 2
          },
          'lwr': {
            color: "#454545",
            /* fillGraph: true, */
            strokePattern: Dygraph.DASHED_LINE
          },
          'upr': {
            color: "#454545",
            /* fillGraph: true, */
            strokePattern: Dygraph.DASHED_LINE
          }
        },
      }
    );
    return graph
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