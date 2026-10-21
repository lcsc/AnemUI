import { BaseApp } from "../BaseApp";
import { BaseFrame, mouseOverFrame } from "./BaseFrame";
import { createElement } from "tsx-create-element";
import Keycloak, { KeycloakProfile } from 'keycloak-js'
import { keycloakUrl, keycloakRealm, keycloakClientId } from "../Env";

export class LoginFrame extends BaseFrame {
    private keycloak:Keycloak;
    private loginContainer:HTMLDivElement
    private authContainer:HTMLDivElement
    private autoHide:HTMLDivElement
    private user:KeycloakProfile

    constructor(_parent: BaseApp) {
        super(_parent)
    }

    public render(): JSX.Element {
        let self = this
        return (<div className='loginFrame max' role="login-container" hidden onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}
            onMouseOut={(event: React.MouseEvent)=>{self.mouseOut(event)}}>
            <i role="loginBtn" className="bi bi-person-circle"></i>
            <div role="logginAutoHidden" hidden >
                <div role="login">
                    <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.login() }}>{this.parent.getTranslation('iniciar_sesion')}</button>
                </div>
                <div role="authenticated" hidden >
                    <div className='d-grid mx-auto gap-2'>
                        <span>{this.parent.getTranslation('usuario')}</span>
                        <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.logout() }}>{this.parent.getTranslation('cerrar_sesion')}</button>
                        <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.profile() }}>{this.parent.getTranslation('perfil')}</button>
                    </div>
                </div>
            </div>
            
        </div>)
    }
    public build(): void {
        this.container = document.querySelector("[role=login-container]")
        this.container.hidden=true;
        this.authContainer=this.container.querySelector("[role=authenticated]")
        this.loginContainer=this.container.querySelector("[role=login]")
        this.autoHide=this.container.querySelector("[role=logginAutoHidden]")

        // render()/build() se llaman dos veces sobre el mismo LoginFrame
        // (cabecera de escritorio y de móvil): una segunda initKeycloak()
        // sustituiría this.keycloak por una instancia sin sesión.
        if (this.keycloak) return;

        this.initKeycloak().then((user:KeycloakProfile)=>{
            //console.log("Init KeyCloak Done")
            this.container.hidden=false;
            if(user!=undefined){
                this.authContainer.hidden=false;
                this.loginContainer.hidden=true;
                this.container.classList.add("logged-in")
                let spanUser=this.authContainer.querySelector("span")
                spanUser.textContent=[this.user.firstName, this.user.lastName].filter(Boolean).join(" ") || this.user.username
            }
            this.parent.onLoginChange(user!=undefined);
        }).catch((error) => {
            console.warn("[LoginFrame] No se ha podido iniciar Keycloak en " + keycloakUrl + ":", error);
            // Sin esto el contenedor sigue oculto y desaparece el botón de login.
            this.container.hidden=false;
        });
    }
    public showFrame(): void {
        this.container.classList.remove("min")
        this.container.classList.add("max")
    }
    public minimize(): void {
        this.container.classList.remove("max")
        this.container.classList.add("min")
    }

    public login():void{
        this.keycloak.login();
    }

    public logout():void{
        this.keycloak.logout();
    }

    public profile():void{
        let url = this.keycloak.createAccountUrl();
        window.open(url, "_blank");
    }

    public isAuthenticated(): boolean {
        return this.keycloak?.authenticated === true;
    }

    // Token vigente para pedir ficheros restringidos; se renueva si caduca en menos de 30 s.
    public async getToken(): Promise<string | undefined> {
        if (!this.isAuthenticated()) return undefined;
        await this.keycloak.updateToken(30);
        return this.keycloak.token;
    }

    public async initKeycloak():Promise<Keycloak.KeycloakProfile> {
        this.keycloak = new Keycloak({
          url: keycloakUrl,
          realm: keycloakRealm,
          clientId: keycloakClientId,
        });
        let authenticated = await this.keycloak.init({onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + window.location.pathname + 'silent-check-sso.html',
            silentCheckSsoFallback: false,
            checkLoginIframe: false,
            redirectUri: window.location.origin + window.location.pathname,
            responseMode:'query',

        })
        
        if(authenticated){
            // Nombre sacado del id token (scope "profile") en vez de
            // loadUserProfile(): /account devuelve 401 para este cliente
            // en central.lcsc.csic.es y además es una petición más.
            const token = this.keycloak.idTokenParsed as {[key:string]:any}
            this.user = {
                firstName: token?.given_name,
                lastName: token?.family_name,
                username: token?.preferred_username,
            }
        }else{
            console.warn("Not Authenticated")
        }
        return this.user;
      }
      public mouseOver(event:React.MouseEvent): void {
            super.mouseOver(event);
            this.autoHide.hidden=false
      }
      public mouseOut(event:React.MouseEvent): void {
        this.autoHide.hidden=true
      }
}
