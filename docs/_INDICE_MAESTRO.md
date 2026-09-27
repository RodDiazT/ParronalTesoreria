# Índice Maestro — Tesorería Parronal

Última actualización: 2026-09-27

## Árbol de carpetas

```
docs/
├── _INDICE_MAESTRO.md
└── _ESTADO_PROYECTO.md
```

Las carpetas de dominio (`marco-general/`, `acceso/`, `organizacion/`, `movimientos/`, `inscripciones/`, `dashboard/`, `rendicion/`) se crean cuando se aprueba el primer documento de cada una.

## Documentos

| Documento | Ruta | Descripción | Estado | Padre |
|---|---|---|---|---|
| Marco general | `docs/marco-general/marco-general-proyecto.md` | Raíz técnica: actores, modelo de dominio, stack, métricas, reglas transversales y reparto v1.0/v1.1 | Pendiente | — |
| Acceso y roles | `docs/acceso/acceso-roles.md` | Login con Google, solicitudes de acceso, aprobación y roles por organización | Pendiente | Marco general |
| Organización y evento | `docs/organizacion/organizacion-evento.md` | Aislamiento multi-organización, configuración del evento y categorías | Pendiente | Marco general |
| Movimientos | `docs/movimientos/movimientos.md` | Ingresos y gastos con respaldo, validación del administrador, anulación y auditoría | Pendiente | Marco general |
| Inscripción de binomios | `docs/inscripciones/inscripcion-binomios.md` | Registro de binomios, pruebas, tarifas y estado de pago | Pendiente | Marco general |
| Dashboard | `docs/dashboard/dashboard.md` | Resumen de ingresos, gastos, balance, por cobrar y KPIs | Pendiente | Marco general |
| Pendientes | `docs/movimientos/pendientes.md` | Cuentas por cobrar, por pagar y tareas de la comisión | Pendiente | Marco general |
| Exportación para rendición | `docs/rendicion/exportacion-rendicion.md` | Libro de movimientos con respaldos en planilla o PDF | Pendiente | Marco general |

Los documentos de componente listados son una identificación inicial. El marco general los confirma, ajusta o descarta.

## Tareas pendientes del responsable

| Tarea | Origen | Estado |
|---|---|---|
| Confirmar si el club emite boletas o facturas (en especial a auspiciadores) | Marco general | Pendiente |
| Definir estructura y tarifas de inscripción: binomio, pruebas o categorías, alojamiento y pensión | Inscripción de binomios | Pendiente |
| Crear cuenta en Railway y confirmar plan y costo mensual | Marco general | Pendiente |
| Crear proyecto en Google Cloud y credenciales OAuth para el login con Google | Acceso y roles | Pendiente |

## Datos estructurados

<!-- CHECKLIST:INICIO -->
```json
{
  "schema_version": "1.0",
  "proyecto": {
    "nombre": "Tesorería Parronal",
    "repositorio": "github",
    "raiz": "https://github.com/RodDiazT/parronaltesoreria/tree/main/docs",
    "actualizado": "2026-09-27"
  },
  "fases": [
    { "id": "v1.0", "nombre": "Núcleo operativo (meta 2026-10-04)", "orden": 1 },
    { "id": "v1.1", "nombre": "Complementos antes del concurso (2026-11-21)", "orden": 2 },
    { "id": "futuro", "nombre": "Versiones futuras", "orden": 3 }
  ],
  "documentos": [
    {
      "id": "marco-general",
      "titulo": "Marco general",
      "tipo": "marco",
      "ruta": "docs/marco-general/marco-general-proyecto.md",
      "padre": null,
      "dominio": "marco-general",
      "descripcion": "Raíz técnica: actores, modelo de dominio, stack, métricas, reglas transversales y reparto v1.0/v1.1",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "acceso-roles",
      "titulo": "Acceso y roles",
      "tipo": "componente",
      "ruta": "docs/acceso/acceso-roles.md",
      "padre": "marco-general",
      "dominio": "acceso",
      "descripcion": "Login con Google, solicitudes de acceso, aprobación y roles por organización",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": ["organizacion-evento"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "organizacion-evento",
      "titulo": "Organización y evento",
      "tipo": "componente",
      "ruta": "docs/organizacion/organizacion-evento.md",
      "padre": "marco-general",
      "dominio": "organizacion",
      "descripcion": "Aislamiento multi-organización, configuración del evento y categorías",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "movimientos",
      "titulo": "Movimientos",
      "tipo": "componente",
      "ruta": "docs/movimientos/movimientos.md",
      "padre": "marco-general",
      "dominio": "movimientos",
      "descripcion": "Ingresos y gastos con respaldo, validación del administrador, anulación y auditoría",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": ["acceso-roles", "organizacion-evento"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "inscripcion-binomios",
      "titulo": "Inscripción de binomios",
      "tipo": "componente",
      "ruta": "docs/inscripciones/inscripcion-binomios.md",
      "padre": "marco-general",
      "dominio": "inscripciones",
      "descripcion": "Registro de binomios, pruebas, tarifas y estado de pago",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": ["movimientos"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "dashboard",
      "titulo": "Dashboard",
      "tipo": "componente",
      "ruta": "docs/dashboard/dashboard.md",
      "padre": "marco-general",
      "dominio": "dashboard",
      "descripcion": "Resumen de ingresos, gastos, balance, por cobrar y KPIs",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": ["movimientos", "inscripcion-binomios"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "pendientes",
      "titulo": "Pendientes",
      "tipo": "componente",
      "ruta": "docs/movimientos/pendientes.md",
      "padre": "marco-general",
      "dominio": "movimientos",
      "descripcion": "Cuentas por cobrar, por pagar y tareas de la comisión",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": ["movimientos"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "exportacion-rendicion",
      "titulo": "Exportación para rendición",
      "tipo": "componente",
      "ruta": "docs/rendicion/exportacion-rendicion.md",
      "padre": "marco-general",
      "dominio": "rendicion",
      "descripcion": "Libro de movimientos con respaldos en planilla o PDF",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": ["movimientos"],
      "version": "0.0",
      "actualizado": "2026-09-27"
    }
  ],
  "tareas": [
    {
      "id": "t-001",
      "descripcion": "Confirmar si el club emite boletas o facturas (en especial a auspiciadores)",
      "responsable": "Rod",
      "origen": "marco-general",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-002",
      "descripcion": "Definir estructura y tarifas de inscripción: binomio, pruebas o categorías, alojamiento y pensión",
      "responsable": "Rod",
      "origen": "inscripcion-binomios",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-003",
      "descripcion": "Crear cuenta en Railway y confirmar plan y costo mensual",
      "responsable": "Rod",
      "origen": "marco-general",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-004",
      "descripcion": "Crear proyecto en Google Cloud y credenciales OAuth para el login con Google",
      "responsable": "Rod",
      "origen": "acceso-roles",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    }
  ]
}
```
<!-- CHECKLIST:FIN -->

## Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Creación del índice con los componentes identificados y las tareas iniciales | Inicio del proyecto |
