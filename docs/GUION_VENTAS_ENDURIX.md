# Guion de Ventas — Endurix

> Documento de apoyo para presentar Endurix a coaches y equipos de resistencia.
> Basado en funcionalidades **reales y ya implementadas** al 2026-07-14.
> Foco actual: running (con base preparada para ciclismo).
> **Tono:** técnico/experto — pensado para hablar de igual a igual con coaches que
> manejan fisiología, periodización y carga. La ficha técnica del modelo está en el §11.

---

## 1. El pitch de 30 segundos (elevator pitch)

> "Endurix es la plataforma todo-en-uno para coaches de resistencia que
> periodizan con datos, no con planillas. Armás plantillas y mesociclos, los
> asignás a atletas o grupos, y la app ingiere las actividades de Strava y Garmin
> para cruzar lo planificado contra lo ejecutado. Sobre ese historial corre un
> modelo de carga impulso-respuesta — CTL, ATL, TSB y ACWR por atleta — y un
> motor de alertas priorizado que te dice a quién atender hoy: quién está en zona
> de riesgo (ACWR alto, TSB muy negativo), quién no cumplió y quién frenó.
> Calendario, carga, feedback (RPE/sensaciones) y chat, en un solo lugar."

**Frase de marca:** *Entrena más inteligente. Rinde por más tiempo.*

---

## 2. El problema que resolvemos (para romper el hielo)

Preguntá primero, no vendas todavía. Detectá el dolor:

- *"¿Cómo llevás hoy los entrenamientos de tus atletas?"* → normalmente Excel,
  WhatsApp, PDFs sueltos, TrainingPeaks caro.
- *"¿Cómo sabés si el atleta realmente hizo lo que le mandaste?"* → no lo saben,
  o lo cruzan a mano con Strava.
- *"¿Cómo detectás que alguien está por lesionarse o sobreentrenado?"* → intuición.

**El dolor típico del coach:**
1. Planificación dispersa en mil herramientas.
2. No hay forma rápida de ver cumplimiento real (planificado vs. ejecutado).
3. Cero visibilidad de fatiga/carga → lesiones y abandono.
4. Comunicación con el atleta desordenada (WhatsApp mezclado con lo personal).

Endurix junta las 4 cosas en una sola herramienta.

---

## 3. Qué hace Endurix a grandes rasgos

Es una plataforma **multi-equipo** con 3 roles:

- **ADMIN** — administra el equipo/plataforma y sus límites.
- **COACH** — gestiona atletas, entrenamientos, carreras y seguimiento.
- **ATLETA** — recibe el plan, sincroniza actividades, da feedback y habla con su coach.

Cada coach solo ve a los atletas de su equipo (aislamiento por equipo).

---

## 4. Funcionalidades para el COACH (el corazón de la venta)

### 4.1. Gestión de atletas (roster)
- Lista de atletas buscable y filtrable por coach, nivel y grupo.
- Ficha de cada atleta con su historial, perfil y métricas.
- Asignación de atletas a grupos y a coaches.

### 4.2. Sumar atletas sin fricción
- **Links de invitación por equipo:** un solo link reutilizable que compartís por
  WhatsApp o QR. El atleta se registra y entra solo al equipo. Sin cargar mails uno por uno.
- Invitación individual por email también disponible.
- **Límite de atletas por equipo** configurable (sirve como tope de plan/pricing).

### 4.3. Constructor de entrenamientos
- Armás **plantillas de entrenamiento reutilizables** con estructura por bloques (drag & drop).
- La app calcula **carga estimada y ritmos** automáticamente.
- Asignás el entrenamiento a un atleta o a un grupo entero.

### 4.4. Planes multi-semana (periodización / mesociclos)
- Construís un **plan completo en una grilla semana × día**, donde cada casillero
  referencia una plantilla de entrenamiento.
- **Aplicás el plan** a un atleta o grupo desde una fecha de inicio → materializa
  semanas enteras de asignaciones de una sola vez.
- **Duplicás planes** para crear variaciones rápido.
- **Copiás y pegás una semana** del calendario de un atleta a otro.

### 4.5. Calendario y cumplimiento
- Vista semanal con lo planificado al lado de lo realmente ejecutado.
- Los entrenamientos completados se matchean con la actividad de Strava/Garmin.
- **Cumplimiento (compliance):** compara lo asignado vs. lo hecho.

### 4.6. Modelo de carga y prevención de lesiones (el diferenciador fuerte)
Este es el argumento para el coach que sabe. No es un "score" inventado: es un
modelo impulso-respuesta estándar corriendo sobre el historial real del atleta.

- **CTL / ATL / TSB / ACWR por atleta**, calculados con EWMA (media móvil
  exponencial): **CTL** (fitness, crónico) con constante de tiempo de 42 días,
  **ATL** (fatiga, agudo) con 7 días. **TSB = CTL − ATL** (forma/frescura) y
  **ACWR** como ratio agudo:crónico. Hay un *warmup* de 42 días para que las series
  arranquen calibradas y no den falsos positivos al principio.
- **Estimación de carga por actividad con jerarquía de fuentes:** si viene
  `load_score` lo usa; si no, `suffer_score`; si no, un TRIMP a partir de LTHR
  (factor de intensidad cuadrático) o de la reserva de FC (Karvonen); último
  recurso, duración. Es decir, aprovecha lo mejor que tenga cada atleta.
- **Clasificación de riesgo transparente** (umbrales visibles y editables por el
  coach): riesgo **alto** con ACWR > 1.5 o TSB < −30; **moderado** con ACWR > 1.3
  o TSB < −15; **bajo estímulo** con ACWR < 0.8 o TSB > 25; si no, **balanceado**.
- **Motor de alertas priorizado (P1–P4):** cada alerta recibe un score que sube
  por recurrencia (patrón repetido en 7 días), proximidad y prioridad de carrera
  (A/B/C), gap de RPE planificado vs. reportado, cumplimiento crítico, spike de
  ACWR, TSB muy negativo y **keywords de riesgo** en el feedback ("dolor",
  "lesión", "pinchazo", "calambre"…). El dashboard te ordena el roster por a quién
  contactar hoy, con acción recomendada (contactar y ajustar carga / revisar
  semana / monitorear / registrar).

> Ficha técnica completa del modelo en el §11 — útil para cerrar con el coach escéptico.

### 4.7. Comunicación y contexto
- **Chat coach↔atleta** de doble vía, dentro de la plataforma (no mezclado con tu WhatsApp personal).
- **Notas privadas del coach** por atleta, que el atleta NO ve (observaciones internas).
- Estas dos cosas están separadas a propósito: contexto privado vs. conversación.

### 4.8. Carreras
- Cargás y asignás carreras objetivo.
- El atleta ve la cuenta regresiva; podés dejar notas de estrategia.

### 4.9. Configuración y control
- Ajustes de coach: **umbrales personalizables** del modelo (los cortes de ACWR y
  TSB para riesgo alto/moderado, threshold de RPE y de cumplimiento que disparan
  alertas). El coach calibra el sistema a su metodología, no al revés.
- Ajustes de equipo: límite de atletas, configuración compartida y **branding del
  equipo** (marca propia en la interfaz — white-label básico).
- **Log de auditoría** append-only de cambios críticos (incluye eventos de los
  links de invitación).

### 4.10. Pausar atletas y "atleta activo comercial" (admin)
El diferenciador comercial: **no cobrás por atletas que no están entrenando.**

- El **admin puede pausar un atleta** sin borrarlo: el atleta **conserva su cuenta,
  su acceso y todo su historial**, y sigue visible en el roster; simplemente deja de
  contar como atleta activo comercial. Se reactiva con un click.
- Distinto de **eliminar**: eliminar saca al atleta del equipo y le corta el acceso.
  Pausar es reversible y no destructivo.
- El roster marca el estado de cada atleta con un badge y se puede **filtrar por
  estado**: **Activo**, **Pausado** (pausa manual del admin) o **Sin actividad**
  (deducido automáticamente).
- **Detección automática de inactividad:** un atleta cuenta como activo si en los
  últimos **30 días** registró una actividad, completó un entrenamiento o tiene una
  asignación futura vigente. Si no cumple ninguna, cae a "sin actividad" — sin que
  el coach tenga que marcarlo a mano.
- El dashboard de admin muestra el conteo de **atletas facturables**, que **excluye
  pausados manuales e inactivos automáticos**. Es la base para la regla "no cobramos
  atletas que no estén entrenando".
- Toda pausa/reactivación manual queda **auditada** (quién y cuándo).

---

## 5. Funcionalidades para el ATLETA

### 5.1. Dashboard diario ("cockpit")
El atleta abre la app y ve su estado del día:
- 4 tarjetas semanales (volumen, tiempo, desnivel, cumplimiento).
- 4 tarjetas de forma física (CTL, ATL, TSB, ACWR con chip de riesgo por color).
- Calendario semanal (asignaciones + actividades sincronizadas).
- Notas del coach (solo lectura) y próximas carreras.
- Tarjeta **"Estado de Forma"** con gráfico de tendencia (7 / 30 / 90 días).
- **Zonas personalizadas** de FC y ritmo (VAM).

> Clave: coach y atleta ven **los mismos números** (mismo endpoint), así que no hay discusión sobre los datos.

### 5.2. Conexión con dispositivos
- **Strava:** conectar/desconectar, sync manual + automático por webhook, import inicial del historial.
- **Garmin (piloto opt-in):** además, el coach puede **empujar el entrenamiento al reloj Garmin** del atleta.

### 5.3. Feedback post-entreno
- Al iniciar sesión, la app puede pedir feedback rápido de la última actividad.
- El atleta reporta **RPE, sensaciones y comentarios** → cierra el loop con el coach.

### 5.4. Zonas y perfil fisiológico
- Configura sus umbrales: FC reposo, FC máx, **LTHR** (umbral de lactato), **VAM**
  (velocidad aeróbica máxima), **UAN** (umbral anaeróbico) y **FTP** (potencia).
- **Zonas de FC derivadas de reposo/máx y LTHR**, y **zonas de ritmo a partir de
  la VAM** — personalizadas a la fisiología de cada atleta, no tablas genéricas.
- Esos mismos umbrales alimentan el modelo de carga (el TRIMP usa LTHR/reserva de
  FC), así que el perfil no es decorativo: mejora la calidad de CTL/ATL/TSB.

### 5.5. Notificaciones
- Inbox in-app + Web Push al navegador.
- Categorías: mensajes de chat, entrenos asignados, recordatorios de carrera,
  bajo cumplimiento, alertas de carga.
- Cada usuario controla preferencias por categoría y frecuencia (inmediata/diaria/semanal).

---

## 6. Por qué Endurix y no lo de siempre (diferenciadores)

| Dolor actual | Con Endurix |
|---|---|
| Excel + WhatsApp + PDF | Todo en una sola plataforma |
| No sé si cumplió el plan | Cumplimiento planificado vs. ejecutado, automático por matcheo de actividad |
| Detecto sobrecarga tarde y a ojo | Modelo EWMA (CTL/ATL/TSB/ACWR) + alertas P1–P4 priorizadas |
| Umbrales genéricos de una tabla | Zonas por LTHR/VAM/FTP y cortes de riesgo calibrables por el coach |
| Sumar atletas es tedioso | Link único por WhatsApp/QR + alta automática al equipo |
| Rearmo mesociclos cada bloque | Plantillas + planes multi-semana + copiar/pegar semanas |
| Pago por cabeza sin importar el uso | Base de "atleta activo": pausás y no contás lo que no entrena (manual + automático a 30 días) |
| Herramientas caras en inglés | En español, enfocado en performance real |

**Posicionamiento:** para coaches y atletas que rechazan la estética "lifestyle"
y quieren entrenamiento estructurado y basado en datos.

---

## 7. Flujo de demo sugerido (5–7 min)

1. **Login como coach** → mostrar el dashboard con roster priorizado y alertas.
2. Abrir la ficha de un atleta → historial, calendario, carga (CTL/ATL/TSB/ACWR), notas.
3. **Crear un entrenamiento** en el builder (mostrar carga/ritmo estimado).
4. **Aplicar un plan multi-semana** a un grupo desde una fecha.
5. Mostrar el **link de invitación** (QR/WhatsApp).
6. **Cambiar a vista atleta** → dashboard, zonas, feedback, chat.
7. Cerrar mostrando cómo una actividad de Strava/Garmin se matchea con lo planificado.

---

## 8. Manejo de objeciones

**"Ya uso TrainingPeaks / Excel."**
→ Perfecto, entonces ya sabés el dolor de cruzar planificado vs. real a mano.
Endurix lo hace automático, en español, y suma chat + alertas de lesión en el mismo lugar.

**"¿Mis atletas tienen que aprender algo nuevo?"**
→ No. Conectan Strava una vez y listo; la app se siente como su tablero personal.
El link de invitación es un solo click.

**"¿Qué pasa con los datos de mis atletas?"**
→ Aislamiento por equipo: cada coach solo ve a los suyos. Notas privadas separadas
del chat. Auditoría de cambios críticos.

**"¿El modelo de carga es serio o es un score inventado?"**
→ Es el estándar de la industria: impulso-respuesta con EWMA, CTL a 42 días y ATL
a 7 (mismos principios que usa TrainingPeaks/PMC). Lo que sumamos es transparencia
(ves los umbrales), calibración por coach y un motor de alertas que prioriza. Ficha
técnica completa en el §11 si querés auditarlo.

**"¿Sirve para ciclismo?"**
→ Hoy está optimizado para running. Ya existe la base para ciclismo (enum de deporte,
FTP en el perfil, zonas de potencia en el builder, renderizado sport-aware de
velocidad). Lo que falta es cerrar el modelo de target/compliance más allá de FC y
ritmo de running. Si tu foco es 100% ciclismo, hoy no es tu herramienta; si es
running (o mixto con base en running), sí.

**"¿Y el precio / facturación?"**
→ (Sé honesto según tu etapa comercial.) El cobro/suscripción integrado todavía no
está en la plataforma; el plan se gestiona por el límite de atletas del equipo. Lo
que sí ya está es la **base de facturación por actividad real**: podés pausar
atletas y la app distingue automáticamente quién está activo, así que el conteo de
"atletas facturables" no incluye a los que no entrenan. La regla comercial —**no
cobrar atletas inactivos**— ya está soportada por el producto.

---

## 9. Qué NO prometer todavía (para no vender humo)

- **Cobro/suscripciones integradas:** el motor de cobro aún no está en la app. Sí
  está la **base**: pausar atletas + conteo de "atletas facturables" que excluye
  pausados e inactivos. No prometas cobro automático todavía; sí podés vender la
  regla "no cobramos lo que no entrena".
- **Ciclismo domain-complete:** foundation lista, no 100% cerrado.
- **Notificaciones por email:** hoy solo in-app + Web Push (email preparado, no cableado).
- **Garmin:** es un **piloto opt-in**, no está abierto a todos por defecto.

Vendé lo que existe. Estas quedan como "lo que viene" si preguntan por roadmap.

---

## 10. Cierre

> "Endurix te devuelve tiempo y te da visibilidad: dejás de perseguir planillas y
> empezás a entrenar con datos. Armemos tu equipo con un link, subamos a 2-3
> atletas esta semana y en 7 días ya vas a ver cumplimiento y carga real de cada uno.
> ¿Arrancamos?"

**Próximo paso concreto:** crear el equipo, generar el link de invitación y sumar
los primeros atletas en la misma reunión.

---

## 11. Ficha técnica del modelo de carga (para el coach escéptico)

Todo lo de abajo está **implementado tal cual** (no es aspiracional). Sirve para
cerrar con coaches que quieren entender el motor antes de confiarle sus atletas.

### Series de carga (impulso-respuesta / EWMA)
- **CTL** (Chronic Training Load — "fitness"): EWMA con τ = **42 días**
  (α = 2/(τ+1)).
- **ATL** (Acute Training Load — "fatiga"): EWMA con τ = **7 días**.
- **TSB** (Training Stress Balance — "forma/frescura") = **CTL − ATL**.
- **ACWR** (ratio agudo:crónico) = **ATL / CTL**.
- **Warmup de 42 días**: la serie se calcula sobre una ventana extendida antes del
  rango visible (7/30/90 días) para que CTL/ATL entren calibrados y no den saltos
  artificiales al inicio.

### Cómo se estima la carga de cada actividad (jerarquía de fuentes)
1. `load_score` de la actividad, si existe.
2. Si no, `suffer_score` (Strava).
3. Si no, **TRIMP por LTHR**: factor de intensidad = FCmedia/LTHR (acotado 0.5–1.5),
   con ponderación **cuadrática** × duración.
4. Si no hay LTHR, **reserva de FC (Karvonen)**: (FCmedia − FCreposo)/(FCmáx − FCreposo).
5. Último recurso: estimación por **duración** sola.

→ Cuanto mejor el perfil fisiológico del atleta (LTHR/FCmáx/reposo), mejor la señal.

### Clasificación de riesgo (umbrales por defecto, editables por el coach)
| Estado | Condición |
|---|---|
| **Alto** | ACWR > 1.5 **o** TSB < −30 |
| **Moderado** | ACWR > 1.3 **o** TSB < −15 |
| **Bajo estímulo** | ACWR < 0.8 **o** TSB > 25 |
| **Balanceado** | resto |
| **Datos insuficientes** | sin historial suficiente |

### Motor de alertas (priorización P1–P4)
- Tipos: violación de zona, nuevo feedback, mismatch de RPE, bajo cumplimiento,
  entreno faltante, carga de entrenamiento.
- El score parte de una base por tipo y **sube** por: recurrencia en 7 días,
  proximidad de carrera (≤14d / ≤30d), prioridad de carrera (A/B/C), gap de RPE,
  cumplimiento crítico, **spike de ACWR** (>1.5 / >1.3), **TSB muy negativo**
  (<−30 / <−15) y **keywords de riesgo** en el feedback (dolor, lesión, mareo,
  pinchazo, calambre, fatiga). **Baja** si ya fue leída o resuelta recientemente.
- Mapa de prioridad: **P1 ≥ 80, P2 ≥ 60, P3 ≥ 35, P4 < 35**. La recurrencia alta
  y el feedback con riesgo escalan la prioridad mínima.
- Cada prioridad trae **acción recomendada**: P1 contactar y ajustar carga · P2
  revisar y ajustar semana · P3 monitorear y hacer check-in · P4 registrar y observar.

### Consistencia coach ↔ atleta
Coach y atleta consumen **el mismo endpoint** de métricas (`getLoadMetrics`) y el
mismo gráfico. No hay dos versiones de la verdad: lo que ve el atleta en su
dashboard es exactamente lo que ve el coach en la ficha.
