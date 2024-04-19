import { InfoDiv } from "anemui-core/src/ui/InfoPanel";
import { BaseApp } from "anemui-core/src/BaseApp";
import { createElement } from "tsx-create-element";

export class EtmInfo extends InfoDiv{
    constructor(_parent: BaseApp, _id: string){
        super(_parent, _id);
    }

    protected getContents(): JSX.Element[] {
        return [(<div>
            <h2 style={{color:"red"}}>Texto copiado de EPM TODO:Actualizar</h2>
            <strong>Descripción</strong>
            <p>Este visor proporciona acceso a un sistema de información probabilística sobre la magnitud, intensidad y frecuencia de eventos
               de precipitación intensa. El sistema cuenta con una frecuencia de actualización diaria y contiene información en valores absolutos
               (volumen de agua precipitada por unidad de superficie), y también de las anomalías de los eventos. Los distintos elementos
               del sistema incluyen: i) un visor histórico sobre los eventos de precipitación intensa desde 1961, ii) la estimación probabilística
               sobre la ocurrencia de eventos de precipitación extrema a partir de las series históricas de estaciones meteorológicas, iii)
               un sistema de monitorización en tiempo real de los extremos de precipitación, integrando su predicción a corto plazo, iv)
               un sistema en el que se muestra la predicción estacional de los mismos y v) proyecciones de eventos de precipitación intensa a futuro.
            </p>
            <strong>Uso</strong>
            <p>Puede utilizar esta herramienta para:</p>
            <p>
                <ul>
                    <li>Visualizar una selección de capas a diferentes escalas en su ordenador, tableta o móvil.</li>
                    <li>Seleccionar y descargar los datos climáticos de diferentes escalas geográficas y temporales.</li>
                    <li>¿Qué más?</li>
                    <li>Futuras mejoras: sistema de vigilancia a tiempo real, sistema de alerta basado en umbrales, sistema de predicción a corto plazo, estacional y proyecciones.</li>
                </ul>
            </p>

            <strong>Otros</strong>
            <p>_Este trabajo de investigación ha sido financiado por el Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)
                y la Comisión Europea - NextGenerationEU (Reglamento UE 2020/2094), a través de la Plataforma Temática Interdisciplinar
                Clima (PTI Clima) / Desarrollo de Servicios Climáticos Operativos del CSIC.
            </p>
            <p>El servicio ha sido desarrollado por la Plataforma Temática Interdisciplinar Clima y Servicios Climáticos (PTI Clima)
                del Consejo Superior de Investigaciones Científicas (CSIC) junto con la Agencia Estatal de Meteorología (AEMET)._
            </p>
        </div>)]
    }
}