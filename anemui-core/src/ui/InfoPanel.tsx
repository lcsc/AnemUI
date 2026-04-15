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

    protected renderLicense():JSX.Element{
        return (<div>
                <h6>Cobertura de cartografía de referencia</h6>
                <ul>
                    <li><strong>Imagen global arcGIS:</strong> <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank">https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer</a></li>
                    <li><strong>Mapa global OpenStreetMap:</strong> <a href="https://planet.openstreetmap.org/" target="_blank">https://planet.openstreetmap.org/</a></li>
                    <li><strong>Imagen global EUMETSAT:</strong> <a href="https://view.eumetsat.int/geoserver/wms" target="_blank">https://view.eumetsat.int/geoserver/wms</a></li>
                    <li><strong>Mapa Topográfico Nacional del IGN:</strong> <a href="https://www.ign.es/wmts/ign-base" target="_blank">https://www.ign.es/wmts/ign-base</a></li>
                    <li><strong>Ortofoto PNOA:</strong> <a href="https://www.ign.es/wms-inspire/pnoa-ma" target="_blank">https://www.ign.es/wms-inspire/pnoa-ma</a></li>
                    <li><strong>Mapa Lidar PNOA:</strong> <a href="https://wmts-mapa-lidar.idee.es/lidar" target="_blank">https://wmts-mapa-lidar.idee.es/lidar</a></li>
                </ul>
                <h6>Licencias</h6>
                <p>Los datos de esta web están disponibles bajo la licencia Open Database License. Cualquier derecho sobre los contenidos individuales de la base de datos está licenciado bajo la Database Contents License.</p>
                <p>Lo que sigue es un resumen legible de la licencia ODbL 1.0. Por favor, lea el texto completo de la licencia ODbL 1.0 para conocer los términos exactos que se aplican.
                    Los usuarios del conjunto de datos pueden:</p>
                <p>
                    <ul>
                        <li><strong>Compartir:</strong> copiar, distribuir y utilizar la base de datos, con o sin fines comerciales.</li>
                        <li><strong>Crear:</strong> producir obras derivadas a partir de la base de datos.</li>
                        <li><strong>Adaptar:</strong> modificar, transformar y construir a partir de la base de datos.</li>
                    </ul>
                </p>
                <p>Bajo las condiciones siguientes:</p>
                    <ul>
                        <li><strong>Atribución:</strong> Debe atribuir cualquier uso público de la base de datos, o trabajos producidos a partir de la base de datos, citando uno o más de los artículos a los que se hace referencia en la sección Referencias más abajo. Para cualquier uso o redistribución de la base de datos, o de los trabajos producidos a partir de ella, debe dejar claro a los demás la licencia de la base de datos original.</li>
                        <li><strong>Compartir por igual:</strong> Si utiliza públicamente cualquier versión adaptada de esta base de datos, o trabajos producidos a partir de una base de datos adaptada, también debe ofrecer esa base de datos adaptada bajo la ODbL.</li>
                    </ul>
                <h6>Financiación</h6>
                <p>Este trabajo de investigación ha sido financiado por el Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO) y la Comisión Europea - NextGenerationEU (Reglamento UE 2020/2094), a través de la Plataforma Temática Interdisciplinar Clima (PTI Clima) / Desarrollo de Servicios Climáticos Operativos del CSIC.</p>
                <p>El servicio ha sido desarrollado por la Plataforma Temática Interdisciplinar Clima y Servicios Climáticos (PTI Clima) del Consejo Superior de Investigaciones Científicas (CSIC) junto con la Agencia Estatal de Meteorología (AEMET).</p>    
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