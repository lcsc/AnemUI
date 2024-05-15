export default class Translate {
    private static instance: Translate;

    public static getInstance(): Translate {
        if (!Translate.instance) {
            Translate.instance = new Translate();
        }

        return Translate.instance;
    }

    private defaultLocale = 'es';

    private locales: any = {
        en: {
            "descargar_nc": "Download NC",
            "descargar_peninsula": "Download Peninsula",
            "descargar_baleares": "Download Baleares",
            "descargar_pixel": "Download Point",
            "opciones_avanzadas": "Advanced Options",
            "grafico_pixel": "Point Graph",
            "paleta": "Palette",
            "en_la_coordenada": "at cell",
            "serie_temporal": "Time series",
            "modelo_lineal":"Time series with linear trend model + confidence intervals",
            "modelo_mg_fr":"Frequency-Magnitude distribution",
            "base_layer":"Base Layer",
            "top_layer":"Data Layer",
            "transparency":"Transparency"
        },
        es: {
            "descargar_nc": "Descargar NC",
            "descargar_peninsula": "Descargar Península",
            "descargar_baleares": "Descargar Baleares",
            "descargar_pixel": "Descargar Píxel",
            "opciones_avanzadas": "Opciones Avanzandas",
            "grafico_pixel": "Gráfico de Píxel",
            "paleta": "Paleta",
            "en_la_coordenada": "en la coordenada",
            "serie_temporal": "Serie temporal",
            "modelo_lineal":"Serie temporal con modelo lineal + intervalos de confianza",
            "modelo_mg_fr":"Modelo magnitud / frecuencia",
            "base_layer":"Capa Base",
            "top_layer":"Capa Info",
            "transparency":"Transparencia"
        }
    }

    public locale(text: string): string {
        if (this.locales[this.defaultLocale][text] !== undefined) {
            return this.locales[this.defaultLocale][text];
        }
        return text;
    }

    public getDefault(): string {
        return this.defaultLocale;
    }

    public setDefault(locale: string){
        this.defaultLocale = locale;
    }
}
