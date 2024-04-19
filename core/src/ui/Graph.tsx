import { createElement } from "tsx-create-element";
import { BaseApp } from "../BaseApp";
import { BaseFrame } from "./BaseFrame";
import Dygraph, { dygraphs } from 'dygraphs';
import { dateText } from "../data/CsPConstans";
import { CsLatLongData } from "../data/CsDataTypes";
import { CsLatLong } from '../CsMapTypes';

require("dygraphs/dist/dygraph.css")

export type GraphType="Serial"|"Linear"|"Cummulative"|"MgFr"|"WindRose"

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
  }

  public setParams(_title: string, _type: GraphType, _byPoint: boolean) {
    this.graphTitle = _title;
    this.graphType = _type;
    this.byPoint = _byPoint;
    switch (_type) {
      case "Serial":
        // this.graphTitle += " Time series";
        this.graphTitle += ": Serie temporal";
        break;
      case "Cummulative":
        // this.graphTitle += " Time series with linear trend model + confidence intervals";
        this.graphTitle += ": Serie temporal con modelo lineal + intervalos de confianza";
        break;
      case "MgFr":
        // this.graphTitle += " Time series with linear trend model + confidence intervals";
        this.graphTitle += ": modelo magnitud / frecuencia";
        break;
    }
  }

  public closeGraph() {
    this.container.hidden = true
  }

  public showGraph(data: any, latlng: CsLatLong = { lat: 0.0, lng: 0.0 }, station = '') {
    //let data:any;
    //console.log("opening Graph")
    this.container.hidden = false;
    let graph:Dygraph
    
    switch (this.graphType) {
      case "Serial":
        var file = new Blob([data], { type: 'text/plain' });
        let url = URL.createObjectURL(file);
        graph=this.drawSerialGraph(url, latlng);
        break;
      case "Linear":
        graph=this.drawLinearGraph(data, station);
        break;
      case "Cummulative":
        graph=this.drawCummulativeGraph(data, latlng);
        break;
      case "MgFr":
        graph=this.drawMgFrGraph(data, station);
        break;
      case "WindRose":
        graph=this.drawWindRoseGraph(data, latlng);
        break;
    }
    this.parent.completeGraph(graph);
  }

  public drawSerialGraph(url: any, latlng: CsLatLong):Dygraph {
    var graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 3,
        fillGraph: true,
        delimiter: ";",
        // title: this.graphTitle + ' at cell [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']',
        title: this.graphTitle + ' en la coordenada [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']',
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

  public drawLinearGraph(url: any, station: any):Dygraph {
    var graph = new Dygraph(
      document.getElementById("popGraph"),
      url,
      {
        labelsDiv: document.getElementById('labels'),
        digitsAfterDecimal: 3,
        title: this.graphTitle + ' en la estación ' + station['name'],
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

  public drawCummulativeGraph(url: any, latlng: CsLatLong):Dygraph {
    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE SUMA ACUMULATIVA en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
  }

  public drawMgFrGraph(url: any, station: any):Dygraph {
    
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
        
        // series: {
        //   'm0.3': {
        //     color: "#0000ee"
        //   },
        //   'p0.9': {
        //     color: "#00ee00",
        //     strokeWidth: 2
        //   },
        //   'p1.5': {
        //     color: "#ee0000",
        //     strokePattern: Dygraph.DASHED_LINE
        //   },
        //   'p2.0': {
        //     color: "#000",
        //   }
        // }
      }
    );
    return graph
  }

  public drawWindRoseGraph(url: any, latlng: CsLatLong):Dygraph{
    document.getElementById("popGraph").innerHTML = 'PENDIENTE: AÑADIR TIPO DE GRÁFICO DE WIND ROSE en la celda [' + latlng.lat.toFixed(2) + ', ' + latlng.lng.toFixed(2) + ']';
    return undefined
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