export default class Language {
    private static instance: Language;

    public static getInstance(): Language {
        if (!Language.instance) {
            Language.instance = new Language();
        }

        return Language.instance;
    }

    private defaultLocale: string = 'es';

    private locales: any = {
        en: {
            "descargar_nc": "Download File",
            "descargar_peninsula": "Download Peninsula",
            "descargar_baleares": "Download Baleares",
            "descargar_canarias": "Download Canarias",
            "descargar_pixel": "Download data",
            "opciones_avanzadas": "Advanced Options",
            "grafico_pixel": "Point Graph",
            "paleta": "Palette",
            "en_la_coordenada": "at cell",
            "en_la_estacion": "at station",
            "serie_temporal": "Time series",
            "modelo_lineal":"Time series with linear trend model + confidence intervals",
            "modelo_mg_fr":"Frequency-Magnitude distribution",
            "base_layer":"Base Layer",
            "top_layer":"Data Layer",
            "transparency":"Transparency",
            "uncertainty":"Uncertainty",
            'estadistico': 'Statistic',
            'periodo_referencia':'Reference period',
            'unidad_adminiastrativa':'Administrative division',
            'demarcaciones_hidrograficas': 'River basin districts',
            'comarcas_agrarias':'Agricultural districts',
            'comarcas_ganaderas':'Livestock districts',
            'cookies_usr':'We use cookies on this site to improve your user experience',
            'cookies_info':'More info',
            'cookies_accept':'Accept',
            'cookies_decline':'Decline',
            'valor_en': 'Value at',
            'hiperarido':'Hyperarid', 
            'arido':'Arid' , 
            'semiarido':'Semiarid', 
            'subh-seco':'Dry Subhumid', 
            'subh-humedo':'Subhumid', 
            'humedo':'Humid',
            'politico':'Political',
            'extremos_calidos':'Hot extremes',
            'extremos_frios':'Cold extremes',
            "olas_calor":"Heat waves",
            "olas_frio":"Cold waves",       
            'rejilla':'Grid',
            'provincia':'Province',
            'monitorizacion':'Monitoring',    
            'climatologia':'Climatology',        
            'magnitud':'Magnitude',
            'ret_periodo':'Return period (years)',
            'temperatura_max':'Maximum temperature',
            'temperatura_min':'Minimum temperature',
            'media':'Average temperature',
            'superficie_afectada':'Affected area %',
            'duracion_ola_frio':'Cold wave duration', 
            'duracion_ola_calor':'Heat wave duration',
            'precipitacion_24':'Precipitation in 24 hours',   
            'season': ['Dec - Feb', 'Mar - May', 'Jun - Aug', 'Sep - Nov'],
            'days': ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            'daysShort': ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            'daysMin': ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            'months': ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"],
            'monthsShort': ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            'today': "Today",
            'clear': "Clear"
        },
        es: {
            "descargar_nc": "Descargar Archivo",
            "descargar_peninsula": "Descargar Península",
            "descargar_baleares": "Descargar Baleares",
            "descargar_canarias": "Descargar Canarias",
            "descargar_pixel": "Descargar datos",
            "opciones_avanzadas": "Opciones Avanzandas",
            "grafico_pixel": "Gráfico de Píxel",
            "paleta": "Paleta",
            "en_la_coordenada": "Coordenada",
            "en_la_estacion": "en la estación",
            "serie_temporal": "Serie temporal",
            "modelo_lineal":"Serie temporal con modelo lineal + intervalos de confianza",
            "modelo_mg_fr":"Curva de magnitud-frecuencia",
            "base_layer":"Capa Base",
            "top_layer":"Capa Info",
            "transparency":"Transparencia",
            "uncertainty":"Incertidumbre",
            'estadistico': 'Estadístico',
            'periodo_referencia':'Período de referencia',
            'unidad_adminiastrativa':'Unidad administrativa',
            'demarcaciones_hidrograficas': 'Demarcaciones hidrográficas',
            'comarcas_agrarias':'Comarcas agrarias',
            'comarcas_ganaderas':'Comarcas ganaderas',
            'cookies_usr':'Utilizamos cookies en este sitio para mejorar su experiencia de usuario',
            'cookies_info':'Más información',
            'cookies_accept':'Aceptar',
            'cookies_decline':'Rechazar',
            'valor_en': 'Valor en',
            'hiperarido':'Hiperárido', 
            'arido':'Árido' , 
            'semiarido':'Semiárido', 
            'subh-seco':'Sub-húmedo seco', 
            'subh-humedo':'Sub-húmedo húmedo', 
            'humedo':'Húmedo',
            'politico':'Político',
            "extremos_calidos":"Extremos cálidos mensuales",
            "extremos_frios":"Extremos fríos mensuales",
            "olas_calor":"Olas de calor",
            "olas_frio":"Olas de frío",       
            'rejilla':'Rejilla',
            'provincia':'Provincia',
            'monitorizacion':'Monitorización',    
            'climatologia':'Climatología',        
            'magnitud':'Magnitud (°C)',
            'ret_periodo':'Periodo de retorno (años)',
            'temperatura_max':'Temperatura máxima',
            'temperatura_min':'Temperatura mínima',
            'media':'Temperatura media',
            'superficie_afectada':'Superficie afectada',
            'duracion_ola_frio':'Duración de la ola de frio', 
            'duracion_ola_calor':'Duración de la ola de calor',   
            'precipitacion_24':'Precipitación en 24h',
            'season': ['Dic - Feb', 'Mar - May', 'Jun - Aug', 'Sep - Nov'],
            'days': ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
            'daysShort': ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
            'daysMin': ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
            'months': ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            'monthsShort': ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            'today': "Hoy",
            'clear': "Borrar"
        }
    }

    public getTranslation(text: string): string {
        if (this.locales[this.defaultLocale][text] !== undefined) {
            return this.locales[this.defaultLocale][text];
        }
        return text;
    }

    public getCode(text: string): string {
        for (const code in this.locales[this.defaultLocale]) {
            if (this.locales[this.defaultLocale][code] === text) {
                return code;
            }
        }
        return text;
    }

    public getDefault(): string {
        return this.defaultLocale;
    }

    public setDefault(locale: string){
        this.defaultLocale = locale;
    }

    public getMonthName(monthIndex: number, short: boolean = false): string {
        const key = short ? 'monthsShort' : 'months';
        const monthsArray = this.locales[this.defaultLocale][key];
        if (monthsArray && Array.isArray(monthsArray) && monthsArray[monthIndex] !== undefined) {
            return monthsArray[monthIndex];
        }
        return monthIndex.toString();
    }
}
