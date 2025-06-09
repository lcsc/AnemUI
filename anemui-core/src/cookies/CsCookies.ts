import { BaseApp } from "../BaseApp";

declare const window: Window & { dataLayer: object[]; };
// declare const window: Window & { dataLayer: Record<string, unknown>[]; };
const gtag: Gtag.Gtag = function () {window.dataLayer.push(arguments);}; 

const loadScript = (src: any) => new Promise((resolve, reject) => {
    let script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)

    let script2 = document.createElement('script')
    script2.innerHTML = " /* Matomo */"
    script2.innerHTML += " var _paq = window._paq = window._paq || [];"
    script2.innerHTML += " /* tracker methods like 'setCustomDimension' should be called before 'trackPageView' */"
    script2.innerHTML += " _paq.push(['trackPageView']);"
    script2.innerHTML += " _paq.push(['enableLinkTracking']);"
    script2.innerHTML += " (function() {"
    script2.innerHTML += " var u='https://estadisticas.hosting.sgai.csic.es/';"
    script2.innerHTML += " _paq.push(['setTrackerUrl', u+'matomo.php']);"
    script2.innerHTML += " _paq.push(['setSiteId', '39']);"
    script2.innerHTML += " var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];"
    script2.innerHTML += " g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);"
    script2.innerHTML += " })();"
    script2.innerHTML += " /* End Matomo Code */"

    document.head.appendChild(script2)
})

export default class CsCookies {
    protected parent:BaseApp
    protected id: string;

    constructor(_parent: BaseApp) {
        this.id = 'G-1NK9CZR6TJ';
        this.parent=_parent;
        loadScript("https://www.googletagmanager.com/gtag/js?id=" + this.id)
            .then(() => {
                window.dataLayer = window.dataLayer || []
                gtag('consent', 'default', {
                    'ad_storage': 'denied',
                    'analytics_storage': 'denied'
                  });
                gtag('js', new Date());
                gtag('config', this.id);
            })
            .catch(console.error)
    }
    
    public addCookies(): void{
        // Utilizamos cookies en este sitio para mejorar su experiencia de usuario
        // Más información https://lcsc.csic.es/es/politica-de-cookies/
        // Aceptar
        // Rechazar
      
        // We use cookies on this site to improve your user experience
        // More info https://lcsc.csic.es/cookies-policy/
        // Accept
        // Decline
      
        // cookie-agreed 0 = no 2 = si
      
        let self = this
        var cookies_div = document.createElement("div");
        cookies_div.id = "cookies_div";
        document.body.appendChild(cookies_div);
      
        var cookies_h2 = document.createElement('h2');
        cookies_h2.innerText = this.parent.getTranslation('cookies_usr');
        cookies_h2.id = 'cookies_h2';
        cookies_div.appendChild(cookies_h2);
      
        var cookies_link = document.createElement('a');
        cookies_link.innerText = this.parent.getTranslation('cookies_info');
        cookies_link.href = 'https://lcsc.csic.es/cookies-policy/';
        cookies_link.id = 'cookies_link';
        cookies_div.appendChild(cookies_link);
      
        var cookies_no_button = document.createElement('button');
        cookies_no_button.innerText = this.parent.getTranslation('cookies_decline');
        cookies_no_button.id = 'cookies_no_button';
        cookies_div.appendChild(cookies_no_button);
      
        var cookies_button = document.createElement('button');
        cookies_button.innerText = this.parent.getTranslation('cookies_accept');
        cookies_button.id = 'cookies_button';
        cookies_div.appendChild(cookies_button);
      
        cookies_button.addEventListener('click', ()=>this.setTrueCookieConsent());
        cookies_no_button.addEventListener('click', ()=>this.setFalseCookieConsent());
      
        if (!localStorage.getItem('cookieConsent')) {
          cookies_div.style.display = 'block';
        }
    };
      
    public setTrueCookieConsent(): void {
        localStorage.setItem('cookieConsent', 'true');
        this.hideCookiePopup();
        gtag('consent', 'update', {
          'ad_storage': 'granted',
          'analytics_storage': 'granted'
        });
    }
      
    public setFalseCookieConsent(): void {
        localStorage.setItem('cookieConsent', 'false');
        this.hideCookiePopup();
        gtag('consent', 'update', {
          'ad_storage': 'denied',
          'analytics_storage': 'denied'
        });
    }

    public hideCookiePopup(): void {
        document.getElementById('cookies_div').style.display = 'none';
    }
}