# Endurix — Marketing Features & Value Propositions

This document is the canonical source for product positioning, sales conversations, social-media copy, and onboarding flows for **Endurix** — the professional-grade platform for endurance coaches and athletes.

---

## 1. Core Value Proposition

### Spanish (primary)
**"Entrena más inteligente. Rinde por más tiempo."**
*(Train smarter. Perform longer.)*

### English
**"Built for coaches. Obsessed with data."**

Endurix is the all-in-one platform for endurance coaches and athletes who reject the "lifestyle" aesthetic in favor of structured, data-driven performance. Three first-class roles — `ADMIN`, `COACH`, `ATHLETE` — share a single multi-tenant workspace where planning, execution, and analysis happen in the same place.

### Why coaches switch
- Stop chasing athletes for uploads. Strava sync is **automatic, real-time, webhook-driven**.
- Stop guessing. The athlete's **CTL / ATL / TSB / ACWR** are visible the moment an activity lands, on both the coach view and the athlete's own dashboard.
- Stop pasting spreadsheets. The workout builder, assignments, calendar, and race prep are all in one place.

### Why athletes stay
- Their coach, their data, and their progress in one place.
- **Personalized training zones** (HR + pace, computed from their VAM) show them exactly what each interval *should* feel like.
- The dashboard tells them if they are **fit, fatigued, fresh, or at risk** before they lace up.

---

## 2. The "Data-First" Product Pillars

### Pillar 1 — Seamless Strava Integration
- **Real-time sync.** Powered by webhooks. Activities appear the moment they are saved. No manual refresh.
- **Full telemetry.** Heart-rate streams, GPS, cadence, power, elevation, laps, splits.
- **Hardened pipeline.** Webhook verification, rate-limited ingestion, signed OAuth state with expiry.

### Pillar 2 — Training Load & Readiness
The athlete's home dashboard is a **fit-fatigue-form-risk** cockpit:

| Card | What it means | Color logic |
|---|---|---|
| **Forma Física (CTL)** | Chronic training load — your aerobic base | Neutral |
| **Fatiga (ATL)** | Acute training load — what you have done recently | Neutral |
| **Forma (TSB)** | Difference between fitness and fatigue. Positive = fresh, negative = loaded. | Green > 5, red < -5, orange otherwise |
| **Riesgo (ACWR)** | Acute:Chronic Workload Ratio — injury-risk signal. | High = red, moderate = orange, balanced = green |

Driven by a **7 / 30 / 90-day range selector** so athletes and coaches can see the trend that matters for the next block or race. The same data appears on the coach's `AthleteDetailsView`, so both sides are looking at the same picture.

### Pillar 3 — Advanced Activity Analysis
- **Intensity distribution** by zone (Z1–Z5), per activity and per week.
- **Personalized pace zones** computed from the athlete's VAM (`calculateTargetPace` + `VAM_ZONES`). The dashboard shows five zones with min/max pace per km.
- **Personalized HR zones** from rest HR / max HR.
- **Laps & splits** with automated and manual analysis, per-lap cadence and speed.
- **Compliance scoring** — did the athlete execute the planned target?

### Pillar 4 — Professional Workout Builder
- **Drag-and-drop series editor.** Build complex interval sessions with steps, blocks, and repeat groups.
- **VAM-based pacing.** Target paces are calculated automatically from the athlete's VAM (`VAM_ZONES`).
- **Power-zone-based pacing.** Target watts calculated from FTP (`StepEditor` power zones).
- **Template library.** Save successful sessions and reuse them across the team.
- **Estimated TSS** per planned workout.

### Pillar 5 — The Feedback Loop
- **RPE & Sensations** captured the moment a new activity is detected (in-app modal).
- **Compliance alerts.** When the actual intensity deviates from the plan, the coach sees it instantly in the priority roster.
- **Coach notes** — private observations, persistent on the athlete profile.
- **Smart alert scoring** that factors load + ACWR + TSB before pinging the coach.

### Pillar 6 — Team & Race Management
- **Group workflows** — assign a workout to the entire marathon-prep group with one click.
- **Race calendar** with countdowns and per-race strategy notes.
- **Coach settings** (thresholds, default models) and **team settings** (branding, default models) persisted per team.

### Pillar 7 — Operations & Trust
- **Append-only admin audit log** (`admin_action_logs`) for every critical write.
- **Standardized API error contract** — codes, not raw strings, with `429` rate-limit headers.
- **Sentry** server + client observability, structured logging, GA4 product funnels.
- **Role-based dashboards**: `ADMIN` gets global ops, `COACH` gets the priority roster, `ATHLETE` gets the fit-fatigue cockpit.

---

## 3. Athlete Home Dashboard (the daily cockpit)

A focused view designed for the athlete, not the coach. What the athlete sees the moment they open the app:

```
┌─ Greeting + week date ──────────────────────────────────────┐
│  Weekly:  Volume  |  Time  |  Elevation  |  Compliance      │
│  Fitness: CTL      |  ATL   |  TSB        |  ACWR Risk       │
├──────────────────────────────────────────────────────────────┤
│  Week navigator + "Add race" CTA                            │
│  Weekly calendar with assignments + Strava activities       │
├──────────────────────────────────────────────────────────────┤
│  Coach Notes (private)             │  Next Races            │
├──────────────────────────────────────────────────────────────┤
│  Estado de Forma — CTL/ATL/TSB trend chart (7/30/90d)       │
├──────────────────────────────────────────────────────────────┤
│  Rendimiento y Zonas                                        │
│  Compliance trend            │  HR Zones + Pace Zones (VAM) │
└──────────────────────────────────────────────────────────────┘
```

The **Pace Zones (VAM)** panel is computed live from the athlete's VAM. If the athlete hasn't set their VAM yet, the card shows a link to `/profile` — closing the loop between configuration and insight.

---

## 4. Coach & Admin Views (one-line summaries)

- **Coach Dashboard** — Priority roster with per-athlete CTL / TSB, critical alerts, group compliance, recent activity, next races.
- **Athlete Detail (5 tabs)** — Resumen, Entrenamiento, Salud y Carga (full load monitoring + 7/30/90 chart), Carreras y Notas, Tendencia.
- **Admin Dashboard** — Total athletes, total groups, active coaches, global view.
- **Admin Audit Log** — Append-only history of critical writes, filterable.

---

## 5. Spanish Copy Bank (ready-to-publish)

### Strava sync
- "Recibe las actividades de tus atletas al instante mediante Webhooks. Sin esperas, sin errores."

### Analysis
- "Gráficos de frecuencia cardíaca, perfiles de elevación y distribución de intensidad por zonas. Convierte el sudor en datos accionables."

### Workout builder
- "Crea entrenamientos estructurados basados en VAM y zonas de potencia. Diseñado para la complejidad del alto rendimiento."

### Feedback loop
- "Métricas de RPE y comentarios de los atletas. Recibe alertas de cumplimiento cuando alguien se desvía del plan."

### Fitness cockpit
- "CTL, ATL, TSB y ACWR en una sola vista. Tu forma, tu fatiga y tu riesgo — antes de salir a correr."

### Personalized zones
- "Zonas de ritmo calculadas a partir de tu VAM. Zonas de FC a partir de tu FC máxima y de reposo. Configúralas una vez, entiéndelas siempre."

---

## 6. English Copy Bank

### Strava sync
> "Real-time activity sync via webhooks. Your athletes' data lands the second they save it."

### Fitness cockpit
> "CTL, ATL, TSB, ACWR — your fitness, fatigue, form, and injury risk on a single screen. The same numbers your coach sees."

### Personalized zones
> "Pace zones built from your VAM. HR zones built from your max and resting heart rate. Your intervals, in your language."

### Coach workflow
> "Stop chasing uploads. Stop guessing. Plan, assign, and analyze in one workspace built for endurance."

### Compliance
> "When actual intensity drifts from plan, the coach gets pinged. When the athlete's ACWR climbs, the system says so."

---

## 7. Social Media Hooks

### For coaches (LinkedIn / Instagram carousel)
- "Deja de perseguir a tus atletas para que suban sus entrenos. Endurix lo hace por ti al segundo con Strava."
- "¿Tus atletas están cumpliendo las zonas? Endurix te avisa cuando la intensidad real no coincide con tu plan."
- "CTL, ATL, TSB, ACWR — en una sola pantalla. La misma pantalla que mira tu atleta."
- "Construye una biblioteca de entrenamientos profesional y gestiónala a escala de equipo."

### For athletes (Instagram reels / TikTok)
- "Tu coach, tus datos y tu progreso en un solo lugar. Integración total con Strava y feedback directo."
- "Mira tus zonas de intensidad como un profesional. Análisis profundo de cada kilómetro."
- "CTL, ATL, TSB, ACWR — la pantalla que tu coach mira. Ahora la tienes tú también."
- "VAM 4:30 → Z3 (Tempo) = 4:34 a 4:57 /km. Entérate de una vez qué significa cada zona."

### Bilingual hooks
- "Train smarter. Perform longer. *Entrena más inteligente. Rinde por más tiempo.*"

---

## 8. Technical "Alive" Metrics (the ones the UI actually shows)

- **TSS (Est.)** — Estimated Training Stress Score per planned session.
- **CTL / ATL / TSB** — Chronic load, acute load, form balance, computed daily via Banister model (τ-CTL=42, τ-ATL=7).
- **ACWR** — Acute:Chronic Workload Ratio with risk classification (`high` / `moderate` / `balanced` / `lowStimulus`).
- **Compliance Rate** — % of planned workouts executed per week, with assignment-to-activity matching.
- **VAM-based pace zones** — 5 zones from `VAM_ZONES` constant, personalized via `calculateTargetPace`.
- **HR zones** — Computed from restHR / maxHR.
- **Power zones** — 7 zones from FTP (visible in the workout builder; cycling roadmap item to surface in athlete profile).

---

## 9. Roadmap (Coming Soon)

- **Garmin Connect Integration** — Push workouts directly to devices.
- **Injury Prediction** — AI-driven insights based on load trends and recovery patterns.
- **Full Cycling Support** — Domain-complete power-duration curve optimization, sport-aware compliance.
- **AI Coach Assistant** — Auto-summaries of weekly feedback, anomaly detection.
- **Multi-language rollout** — Beyond current `es` locale (English in queue).

---

## 10. Brand Voice

- **Spanish**: Direct, technical, "spec-sheet" feel. Uppercase labels (e.g. "MONITOREO DE CARGA") for category headers.
- **English**: Same tone. Marketing copy: short, declarative, anti-hype.
- **Visual**: "Performance Curator" aesthetic — paper-like surface hierarchy, off-white base (`#f8f9fa`), brand orange (`#FF6800`) reserved for action/accent only, no heavy shadows, Exo 2 / IBM Plex Mono / Inter typography.

Reference: `docs/DESIGN.md`, `docs/DASHBOARD-DESIGN-SYSTEM.md`.
