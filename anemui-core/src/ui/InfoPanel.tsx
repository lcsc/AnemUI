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
                <strong>Licencias</strong>
                <p>Los datos de esta web están disponibles bajo la licencia Open Database License. Cualquier derecho sobre los contenidos individuales de la base de datos está licenciado bajo la Database Contents License.</p>
                <p>Lo que sigue es un resumen legible de la licencia ODbL 1.0. Por favor, lea el texto completo de la licencia ODbL 1.0 para conocer los términos exactos que se aplican.
                    Los usuarios del conjunto de datos pueden:</p>
                <p>
                    <ul>
                        <li>Compartir: copiar, distribuir y utilizar la base de datos, con o sin fines comerciales.</li>
                        <li>Crear: producir obras derivadas a partir de la base de datos.</li>
                        <li>Adaptar: modificar, transformar y construir a partir de la base de datos.</li>
                    </ul>
                </p>
                <p>Bajo las condiciones siguientes:
                    <ul>
                        <li>Atribución: Debe atribuir cualquier uso público de la base de datos, o trabajos producidos a partir de la base de datos, citando uno o más de los artículos a los que se hace referencia en la sección Referencias más abajo. Para cualquier uso o redistribución de la base de datos, o de los trabajos producidos a partir de ella, debe dejar claro a los demás la licencia de la base de datos original.</li>
                        <li>Compartir por igual: Si utiliza públicamente cualquier versión adaptada de esta base de datos, o trabajos producidos a partir de una base de datos adaptada, también debe ofrecer esa base de datos adaptada bajo la ODbL.</li>
                    </ul>
                </p>
        </div>)
    }

    public render(): JSX.Element {
        return (<div id={this.id}>
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
            <div className='infoFrame max' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }} onClick={(event: React.MouseEvent) => { self.onClick() }}>
                <button type="button" role="nc" className="navbar-sm-btn"><i role="infoBtn" className="bi bi-info"></i></button>
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

        this.modal.setContent(this.parent.getInfoDiv().getDiv());
        let self=this
        this.modal.addFooterBtn('Cerrar', 'tingle-btn tingle-btn--danger tingle-btn--pull-right', function() {
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