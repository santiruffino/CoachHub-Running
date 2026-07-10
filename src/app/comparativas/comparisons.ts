/**
 * Data source for the public "comparativas" (comparison) SEO pages.
 *
 * These are high-intent, indexable content pages (e.g. "endurix vs planillas").
 * Content is Spanish-only to match the single active locale. Claims about other
 * products are framed as positioning based on public information — kept fair and
 * hedged on purpose (see the disclaimer rendered on each page).
 */

export type CellValue = boolean | string;

export interface ComparisonRow {
    feature: string;
    endurix: CellValue;
    them: CellValue;
}

export interface Comparison {
    slug: string;
    /** Full competitor name used in prose and titles. */
    competitor: string;
    /** Short column header for the competitor. */
    themLabel: string;
    /** Meta + H1 title. */
    title: string;
    /** Meta description (<160 chars). */
    description: string;
    /** One-paragraph intro shown under the H1. */
    intro: string;
    rows: ComparisonRow[];
    /** Closing positioning line. */
    verdict: string;
}

export const comparisons: Comparison[] = [
    {
        slug: 'endurix-vs-planillas',
        competitor: 'planillas y WhatsApp',
        themLabel: 'PLANILLAS + WHATSAPP',
        title: 'Endurix vs. planillas y WhatsApp',
        description:
            'Comparativa entre Endurix y el método de planillas de Excel + WhatsApp para entrenar atletas de resistencia: automatización, carga, integraciones y escala.',
        intro:
            'Entrenar con planillas y WhatsApp funciona hasta que sumás atletas. A partir de ahí, cada plan, cada seguimiento y cada mensaje suma horas. Así se compara con reunir todo en una sola plataforma que además automatiza lo repetitivo.',
        rows: [
            { feature: 'Crear un plan', endurix: 'Con IA, a mano o plantillas reutilizables', them: 'Celda por celda en Excel' },
            { feature: 'Sincronización de actividades', endurix: 'Automática desde Strava y Garmin', them: 'Copiar y pegar a mano' },
            { feature: 'Monitoreo de carga', endurix: 'Cálculo automático + alertas', them: false },
            { feature: 'Comunicación con el atleta', endurix: 'En la misma plataforma, con contexto', them: 'WhatsApp suelto, sin el plan al lado' },
            { feature: 'App para el atleta', endurix: true, them: false },
            { feature: 'Asistente IA (MCP)', endurix: true, them: false },
            { feature: 'Escalar a muchos atletas', endurix: 'Mismo criterio a escala', them: 'Limitado por tus horas' },
            { feature: 'Historial y métricas', endurix: 'Centralizado y visual', them: 'Disperso entre archivos y capturas' },
        ],
        verdict:
            'Si recién arrancás, una planilla alcanza. Si querés crecer sin que cada atleta te sume horas, Endurix reúne la operación y automatiza lo repetitivo.',
    },
    {
        slug: 'endurix-vs-trainingpeaks',
        competitor: 'TrainingPeaks',
        themLabel: 'TRAININGPEAKS',
        title: 'Endurix vs. TrainingPeaks',
        description:
            'Comparativa entre Endurix y TrainingPeaks para entrenadores de resistencia: enfoque en equipos, asistente de IA vía MCP, integraciones y experiencia en español.',
        intro:
            'TrainingPeaks es una herramienta madura y muy completa, sobre todo para el atleta individual. Endurix nace con otro foco: la operación del coach con muchos atletas, un asistente de IA nativo y una experiencia pensada en español.',
        rows: [
            { feature: 'Enfoque', endurix: 'Multi-atleta, centrado en el equipo del coach', them: 'Fuerte en el atleta individual' },
            { feature: 'Asistente IA (MCP)', endurix: 'Nativo, vía MCP', them: 'Sin asistente con MCP' },
            { feature: 'Integración Strava y Garmin', endurix: true, them: true },
            { feature: 'Resúmenes automáticos con IA', endurix: true, them: 'Manual / parcial' },
            { feature: 'Idioma y soporte', endurix: 'Español, soporte cercano', them: 'Principalmente en inglés' },
            { feature: 'Curva de aprendizaje', endurix: 'Interfaz enfocada', them: 'Muy amplia, puede abrumar' },
            { feature: 'Precio', endurix: 'Acceso anticipado con descuento fundador', them: 'Suscripción por atleta' },
        ],
        verdict:
            'TrainingPeaks es una gran opción consolidada. Endurix apuesta por una operación de coaching más simple, en español y con IA integrada desde el primer día.',
    },
];

export function getComparison(slug: string): Comparison | undefined {
    return comparisons.find((c) => c.slug === slug);
}
