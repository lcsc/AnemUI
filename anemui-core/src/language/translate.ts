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
            "transparency":"Transparency",
            'estadistico': 'Statistic',
            'periodo_referencia':'Reference period',
            'month': {
                1: "January",
                2: "February",
                3: "March",
                4: "April",
                5:  "May",
                6: "June",
                7: "July",
                8: "August",
                9: "September",
                10: "October",
                11: "November",
                12: "December"
            },
            'season': {
                1: 'Jun - Sep',
                2: 'Sep - Dic',
                3: 'Dic - Mar',
                4: 'Mar - Jun'
            }
        },
        es: {
            descargar_nc: "Descargar NC",
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
            "transparency":"Transparencia",
            'estadistico': 'Estadístico',
            'periodo_referencia':'Período de referencia',
            'month': {
                0: "Enero",
                1: "Febrero",
                2: "Marzo",
                3: "Abril",
                4:  "Mayo",
                5: "Junio",
                6: "Julio",
                7: "Agosto",
                8: "Septiembre",
                9: "Octubre",
                10: "Noviembre",
                11: "Diciembre"
            },
            'season': {
                0: 'Jun - Sep',
                1: 'Sep - Dic',
                2: 'Dic - Mar',
                3: 'Mar - Jun'
            }

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
