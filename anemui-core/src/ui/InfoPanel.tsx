import { BaseApp } from "../BaseApp";
import { BaseFrame, mouseOverFrame } from "./BaseFrame";
import { createElement } from "tsx-create-element";
import { modal } from "tingle.js"

require("tingle.js/dist/tingle.css")

export class InfoDiv extends BaseFrame {
    protected container: HTMLDivElement;
    protected id: string

    constructor(_parent: BaseApp, _id: string) {
        super(_parent)
        this.id = _id;
    }
    public build(): void {
        this.container = document.getElementById(this.id) as HTMLDivElement
    }
    public minimize(): void {
        throw new Error("Method not implemented.");
    }
    public showFrame(): void {
        throw new Error("Method not implemented.");
    }

    protected getContents():JSX.Element[]{
        return [];
    }

    protected renderContents():JSX.Element[]{
        let ret = this.getContents();
        ret.push(this.renderLicense());
        return ret;
    }

    protected getEmail():string{
        return "buzonplataformaclima@aemet.es";
    }


    protected renderLicense():JSX.Element{
        return (<div>
                <h6>Cobertura de cartografía de referencia</h6>
                <ul>
                    <li><strong>Imagen global arcGIS:</strong> <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank">https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer</a></li>
                    <li><strong>Mapa global OpenStreetMap:</strong> <a href="https://planet.openstreetmap.org/" target="_blank">https://planet.openstreetmap.org/</a></li>
                    <li><strong>Imagen global GEBCO:</strong> <a href="https://www.gebco.net/data-products/gebco-web-services/web-map-service" target="_blank">https://www.gebco.net/data-products/gebco-web-services/web-map-service</a></li>
                    <li><strong>Mapa Topográfico Nacional del IGN:</strong> <a href="https://www.ign.es/wmts/ign-base" target="_blank">https://www.ign.es/wmts/ign-base</a></li>
                    <li><strong>Ortofoto PNOA:</strong> <a href="https://www.ign.es/wms-inspire/pnoa-ma" target="_blank">https://www.ign.es/wms-inspire/pnoa-ma</a></li>
                    <li><strong>Mapa Lidar PNOA:</strong> <a href="https://wmts-mapa-lidar.idee.es/lidar" target="_blank">https://wmts-mapa-lidar.idee.es/lidar</a></li>
                </ul>
                <h6>Licencias</h6>
                <p>Los datos de esta web están disponibles bajo la licencia Creative Commons Attribution 4.0 International (CC BY 4.0).</p>
                <p>Lo que sigue es un resumen legible de la licencia CC BY 4.0. El detalle completo se puede consultar en <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank">https://creativecommons.org/licenses/by/4.0/deed.es</a></p>
                <p>Los usuarios del conjunto de datos pueden:</p>
                <p>
                    <ul>
                        <li><strong>Compartir:</strong> copiar y redistribuir el material en cualquier medio o formato, con o sin fines comerciales.</li>
                        <li><strong>Adaptar:</strong> remezclar, transformar y crear a partir del material para cualquier propósito, incluso comercial.</li>
                    </ul>
                </p>
                <p>Bajo las siguientes condiciones:</p>
                    <ul>
                        <li><strong>Atribución:</strong> Debe reconocer adecuadamente la autoría, proporcionar una referencia a la licencia e indicar si se han realizado cambios. La atribución deberá realizarse incluyendo el texto al que se hace referencia en la sección Referencias más abajo. Para cualquier uso o redistribución del conjunto de datos, o de los trabajos derivados, debe dejar claro a los demás que el material original está disponible bajo la licencia CC BY 4.0.</li>
                        <li><strong>Sin restricciones adicionales:</strong> No puede aplicar términos legales ni medidas tecnológicas que restrinjan legalmente a otros el ejercicio de los derechos concedidos por la licencia.</li>
                    </ul>
                <p>La licencia CC BY 4.0 no exige que las obras derivadas se distribuyan bajo la misma licencia, por lo que los usuarios pueden elegir la licencia de sus adaptaciones o productos derivados, siempre que cumplan con la obligación de atribución establecida anteriormente.</p>
                <p><strong>Referencia:</strong> Plataforma Estatal de Servicio Climático (AEMET-CSIC), <a href="http://plataforma-clima.aemet.es" target="_blank">http://plataforma-clima.aemet.es</a></p>
                <p><strong>Exención de responsabilidad:</strong> Los datos y productos se proporcionan “tal cual”, sin garantías de ningún tipo, ni expresas ni implícitas, incluyendo, entre otras, garantías de exactitud, integridad, actualidad, idoneidad para un propósito particular o ausencia de errores. Los proveedores de los datos y las instituciones participantes no asumen responsabilidad alguna por cualquier daño, pérdida o perjuicio, directo o indirecto, derivado del uso o de la imposibilidad de uso de estos datos o de los productos generados a partir de ellos. La utilización de esta información es responsabilidad exclusiva del usuario, quien deberá valorar su adecuación al uso previsto y complementarla, cuando sea necesario, con el correspondiente juicio experto.</p>
                <h6>Financiación</h6>
                <p>La Plataforma Estatal de Servicios Climáticos está financiada con el contrato CSC2023-02-00 por parte del Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO) y la Comisión Europea NextGenerationEU (Reglamento UE 2020/2094).</p>
                <p>El servicio ha sido desarrollado por la Plataforma Temática Interdisciplinar Clima y Servicios Climáticos (PTI Clima) del Consejo Superior de Investigaciones Científicas (CSIC) junto con la Agencia Estatal de Meteorología (AEMET).</p>
                
                <h6>Contacto</h6>
                <p>Para cualquier consulta o información adicional, puede ponerse en contacto con nosotros a través del correo electrónico: <a href={`mailto:${this.getEmail()}`}>{this.getEmail()}</a></p>
        </div>)
    }

    public render(): JSX.Element {
        return (<div id={this.id} hidden>
            <div className="modal-header">
                <h1>{document.title}</h1>
            </div>
            <div className="modal-content">
                {this.renderContents()}
            </div>
        </div>);
    }

    public getDiv(): HTMLDivElement {
        return this.container;
    }
}

export class InfoFrame extends BaseFrame {

    private btn: HTMLElement
    private modal: modal;
    constructor(_parent: BaseApp) {
        super(_parent)
    }


    public onClick() {
        this.modal.open();
    }

    public render(): JSX.Element {
        let self = this
        return (
            <div className='topbar-icon-btn' title="Descripción" onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }} onClick={(event: React.MouseEvent) => { self.onClick() }}>
                <i role="infoBtn" className="bi bi-info-circle"></i>
            </div>
        )
    }

    public build(): void {
        //throw new Error("Method not implemented.");
        this.btn = document.querySelector("[role=infoBtn]")
        this.modal = new modal({
            footer: true,
            stickyFooter: false,
            closeMethods: ['overlay', 'button', 'escape'],
            closeLabel: "Cerrar",
            //cssClass: ['custom-class-1', 'custom-class-2'],
            onOpen: function () {
                //console.log('modal open');
            },
            onClose: function () {
                //console.log('modal closed');
            },
            beforeClose: function () {
                // here's goes some logic
                // e.g. save content before closing the modal
                return true; // close the modal
            }
        });

        let infoDiv = this.parent.getInfoDiv().getDiv();
        infoDiv.removeAttribute('hidden');
        this.modal.setContent(infoDiv);
        let self=this
        this.modal.addFooterBtn('Cerrar', 'tingle-btn tingle-btn--muted tingle-btn--pull-right', function() {
            self.modal.close();
          });
    }

    public showFrame(): void {
        //
        // this.btn.classList.remove("bi-info")
        this.btn.parentElement.classList.remove("min")
        // this.btn.classList.add("bi-info-circle-fill")
        this.btn.parentElement.classList.add("max")
    }
    public minimize(): void {
        // this.btn.classList.remove("bi-info-circle-fill")
        this.btn.parentElement.classList.remove("max")
        this.btn.classList.add("bi-info")
        this.btn.parentElement.classList.add("min")
    }
}