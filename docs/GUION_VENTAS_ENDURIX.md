# Guion de Ventas — Endurix

> Documento de apoyo para presentar Endurix a coaches y equipos de resistencia.
> Basado en funcionalidades **reales y ya implementadas** al 2026-07-13.
> Foco actual: running (con base preparada para ciclismo).

---

## 1. El pitch de 30 segundos (elevator pitch)

> "Endurix es la plataforma todo-en-uno para coaches de resistencia que quieren
> entrenar con datos, no con planillas. Vos armás los entrenamientos y planes,
> se los asignás a tus atletas, y la app se conecta con Strava y Garmin para
> comparar lo planificado contra lo que realmente hicieron. Vos ves de un vistazo
> quién está sobrecargado, quién no cumplió y quién necesita tu atención hoy.
> Todo en un solo lugar: calendario, carga de entrenamiento, feedback y chat con
> el atleta."

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

### 4.6. Carga de entrenamiento y prevención (el diferenciador fuerte)
- Calcula **CTL, ATL, TSB y ACWR** por atleta desde el historial de actividad.
- Permite ver fatiga, forma y **riesgo de lesión** de un vistazo.
- **Alertas inteligentes con puntaje de urgencia:** el dashboard prioriza a quién
  atender hoy (bajo cumplimiento, sobrecarga, entrenos faltantes).

### 4.7. Comunicación y contexto
- **Chat coach↔atleta** de doble vía, dentro de la plataforma (no mezclado con tu WhatsApp personal).
- **Notas privadas del coach** por atleta, que el atleta NO ve (observaciones internas).
- Estas dos cosas están separadas a propósito: contexto privado vs. conversación.

### 4.8. Carreras
- Cargás y asignás carreras objetivo.
- El atleta ve la cuenta regresiva; podés dejar notas de estrategia.

### 4.9. Configuración y control
- Ajustes de coach (umbrales, preferencias) y de equipo (límite de atletas, config compartida).
- **Log de auditoría** append-only de cambios críticos.

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

### 5.4. Zonas y perfil
- Configura sus umbrales (FC reposo, FC máx, LTHR, VAM, UAN, FTP).
- Zonas de FC y ritmo personalizadas a su fisiología.

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
| No sé si cumplió el plan | Cumplimiento planificado vs. ejecutado automático |
| Detecto lesiones tarde | CTL/ATL/TSB/ACWR + alertas priorizadas |
| Sumar atletas es tedioso | Link único por WhatsApp/QR |
| Rearmo planes cada bloque | Plantillas + planes multi-semana + copiar/pegar |
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

**"¿Sirve para ciclismo?"**
→ Hoy está optimizado para running, con base ya preparada para ciclismo (zonas de
potencia, FTP, tipos de deporte). El roadmap de ciclismo está en marcha.

**"¿Y el precio / facturación?"**
→ (Sé honesto según tu etapa comercial.) La facturación integrada todavía no está
en la plataforma; el plan se gestiona por el límite de atletas del equipo.

---

## 9. Qué NO prometer todavía (para no vender humo)

- **Facturación/suscripciones integradas:** aún no está en la app.
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
