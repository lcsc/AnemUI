import { BaseApp } from "../BaseApp";
import { BaseFrame, mouseOverFrame } from "./BaseFrame";
import { createElement } from "tsx-create-element";
import Keycloak, { KeycloakProfile } from 'keycloak-js'
import { MouseEvent } from "react";
import { event } from "jquery";

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
            <i role="loginBtn" className="bi bi-incognito"></i>
            <div role="logginAutoHidden" hidden >
                <div role="login">
                    <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.login() }}>Iniciar sesión</button>
                </div>
                <div role="authenticated" hidden >
                    <div className='d-grid mx-auto gap-2'>
                        <span>User:</span>
                        <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.logout() }}>Cerrar sesión</button>
                        <button type="button" role="nc" className="btn btn-primary .btn-sm" onClick={() => { this.profile() }}>Perfil</button>
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

        this.initKeycloak().then((user:KeycloakProfile)=>{
            //console.log("Init KeyCloak Done")
            this.container.hidden=false;
            if(user!=undefined){
                this.authContainer.hidden=false;
                this.loginContainer.hidden=true;
                let img:HTMLElement=this.container.querySelector("i.bi")
                img.classList.remove("bi-incognito");
                img.classList.add("bi-person-lines-fill")
                let spanUser=this.authContainer.querySelector("span")
                spanUser.textContent=this.user.firstName+" "+this.user.lastName
            }
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

    public async initKeycloak():Promise<Keycloak.KeycloakProfile> {
        this.keycloak = new Keycloak({
          //url: window.location.origin +'/iam/',
          url: 'https://yesa.eead.csic.es/iam/',
          realm: 'lcsc',
          clientId: 'AnemUI-Dev',
        });
        let authenticated = await this.keycloak.init({onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + window.location.pathname + 'silent-check-sso.html',
            silentCheckSsoFallback: false,
            redirectUri: window.location.origin + window.location.pathname,
            responseMode:'query',

        })
        
        if(authenticated){
            this.user = await this. keycloak.loadUserProfile()
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
