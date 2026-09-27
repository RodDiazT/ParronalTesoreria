# Índice Maestro — Tesorería Parronal

Última actualización: 2026-09-27

## Árbol de carpetas

```
docs/
├── _INDICE_MAESTRO.md
├── _ESTADO_PROYECTO.md
├── marco-general/
│   └── marco-general-proyecto.md
└── organizacion/
    └── organizacion-evento.md
```

Las carpetas de dominio (`acceso/`, `organizacion/`, `movimientos/`, `inscripciones/`, `dashboard/`, `rendicion/`) se crean con el primer documento de cada una (borrador o aprobado). Los hijos van en una subcarpeta con el nombre del padre (por ejemplo, `inscripciones/inscripcion-binomios/`).

## Documentos

| Documento | Ruta | Descripción | Estado | Fase | Padre |
|---|---|---|---|---|---|
| Marco general | `docs/marco-general/marco-general-proyecto.md` | Raíz técnica: actores, permisos, modelo de dominio, reglas de negocio, stack, cumplimiento y plan | Aprobado (v1.1) | v1.0 | — |
| Organización y evento | `docs/organizacion/organizacion-evento.md` | Aislamiento, carga inicial, configuración del evento, categorías y contrapartes | Aprobado (v1.0) | v1.0 | Marco general |
| Acceso y roles | `docs/acceso/acceso-roles.md` | Login con Google, solicitudes, aprobación, roles, permisos y aviso de privacidad | Pendiente | v1.0 | Marco general |
| Movimientos | `docs/movimientos/movimientos.md` | Ingresos y gastos con respaldo u observación, validación, anulación, por cobrar y por pagar, reembolsos, especie y auditoría | Pendiente | v1.0 | Marco general |
| Participantes | `docs/inscripciones/participantes.md` | Jinetes, apoderados, caballos y clubes: datos, reglas de edad y apoderado, duplicados | Pendiente | v1.0 | Marco general |
| Inscripción de binomios | `docs/inscripciones/inscripcion-binomios.md` | Binomios, pruebas, tarifas, descuentos, pagos, asignación y devoluciones | Pendiente | v1.0 | Marco general |
| Importación desde Excel | `docs/inscripciones/inscripcion-binomios/importacion-excel.md` | Plantilla, vista previa, duplicados y carga de binomios | Pendiente | v1.0 | Inscripción de binomios |
| Dashboard | `docs/dashboard/dashboard.md` | Indicadores de la sección 6.7 del marco en v1.0; KPIs ampliados en v1.1 | Pendiente | v1.0 | Marco general |
| Formulario de inscripción | `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` | Enlace de solo envío, solicitudes por revisar y autorización del apoderado | Pendiente | v1.1 | Inscripción de binomios |
| Registro sin señal | `docs/movimientos/movimientos/registro-sin-senal.md` | Borrador local en el teléfono y cola de envío al volver la conexión | Pendiente | v1.1 | Movimientos |
| Conciliación con cartola | `docs/movimientos/conciliacion-cartola.md` | Carga de cartola, cruce por monto, fecha y nombre, sugerencias con IA y confirmación | Pendiente | v1.1 | Marco general |
| Pendientes | `docs/movimientos/pendientes.md` | Vista consolidada de por cobrar y por pagar, y tareas de la comisión | Pendiente | v1.1 | Marco general |
| Cierre y rendición | `docs/rendicion/exportacion-rendicion.md` | Cierre del evento, informe de rendición y exportación a planilla y PDF | Pendiente | v1.1 | Marco general |

Orden de trabajo de v1.0 (marco general, sección 12): Organización y evento + Acceso y roles → Movimientos → Participantes → Inscripción de binomios → Importación desde Excel → Dashboard.

## Tareas pendientes del responsable

Dos categorías: **Desarrollo** (lo que Rod configura o entrega para que el proyecto avance: cuentas, credenciales, datos de carga) y **Club** (lo que Rod debe conversar con el club para cerrar definiciones y configuraciones).

### Desarrollo

| Id | Tarea | Origen | Estado |
|---|---|---|---|
| t-003 | Crear el proyecto en la cuenta Railway existente (Postgres + volumen) | Marco general | Pendiente |
| t-004 | Crear proyecto en Google Cloud y credenciales OAuth para el login con Google | Acceso y roles | Pendiente |
| t-007 | Verificar si el plan de Railway incluye copias de seguridad de la base y del volumen | Marco general | Pendiente |
| t-011 | Entregar los datos de la carga inicial: nombre del club y del evento, fechas, lugar y correos Google de los dos administradores | Organización y evento | Pendiente |

### Club

| Id | Tarea | Origen | Estado |
|---|---|---|---|
| t-001 | Confirmar si el club emite boletas o facturas (en especial a auspiciadores) | Marco general | Pendiente |
| t-002 | Definir pruebas, categorías (incluidas las por edad y la fecha de corte), tarifas, descuentos, alojamiento y pensión | Inscripción de binomios | Pendiente |
| t-005 | Averiguar el banco de la cuenta que recibe las transferencias y el formato de su cartola | Conciliación con cartola | Pendiente |
| t-006 | Confirmar si habrá wifi en el club el día del evento | Registro sin señal | Pendiente |
| t-008 | Validar con el club el plazo de rendición de 30 días (hasta el 2026-12-21) | Cierre y rendición | Pendiente |
| t-009 | Confirmar con el club si entregará un aporte inicial (fondos o saldo previo) a la comisión | Organización y evento | Pendiente |
| t-010 | Conseguir el logo del club en PNG, JPEG o WebP (máx. 1 MB) | Organización y evento | Pendiente |

## Datos estructurados

<!-- CHECKLIST:INICIO -->
```json
{
  "schema_version": "1.1",
  "proyecto": {
    "nombre": "Tesorería Parronal",
    "repositorio": "github",
    "raiz": "https://github.com/RodDiazT/parronaltesoreria/tree/main/docs",
    "actualizado": "2026-09-27"
  },
  "fases": [
    {
      "id": "v1.0",
      "nombre": "Núcleo operativo (meta 2026-10-04)",
      "orden": 1
    },
    {
      "id": "v1.1",
      "nombre": "Complementos antes del concurso (objetivo 2026-11-14, límite 2026-11-21)",
      "orden": 2
    },
    {
      "id": "futuro",
      "nombre": "Versiones futuras",
      "orden": 3
    }
  ],
  "documentos": [
    {
      "id": "marco-general",
      "titulo": "Marco general",
      "tipo": "marco",
      "ruta": "docs/marco-general/marco-general-proyecto.md",
      "padre": null,
      "dominio": "marco-general",
      "descripcion": "Raíz técnica: actores, permisos, modelo de dominio, reglas de negocio, stack, cumplimiento y plan",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [],
      "version": "1.1",
      "actualizado": "2026-09-27"
    },
    {
      "id": "organizacion-evento",
      "titulo": "Organización y evento",
      "tipo": "componente",
      "ruta": "docs/organizacion/organizacion-evento.md",
      "padre": "marco-general",
      "dominio": "organizacion",
      "descripcion": "Aislamiento, carga inicial, configuración del evento, categorías y contrapartes",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [],
      "version": "1.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "acceso-roles",
      "titulo": "Acceso y roles",
      "tipo": "componente",
      "ruta": "docs/acceso/acceso-roles.md",
      "padre": "marco-general",
      "dominio": "acceso",
      "descripcion": "Login con Google, solicitudes, aprobación, roles, permisos y aviso de privacidad",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "organizacion-evento"
      ],
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
      "descripcion": "Ingresos y gastos con respaldo u observación, validación, anulación, por cobrar y por pagar, reembolsos, especie y auditoría",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "acceso-roles",
        "organizacion-evento"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "participantes",
      "titulo": "Participantes",
      "tipo": "componente",
      "ruta": "docs/inscripciones/participantes.md",
      "padre": "marco-general",
      "dominio": "inscripciones",
      "descripcion": "Jinetes, apoderados, caballos y clubes: datos, reglas de edad y apoderado, duplicados",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "organizacion-evento"
      ],
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
      "descripcion": "Binomios, pruebas, tarifas, descuentos, pagos, asignación y devoluciones",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "participantes",
        "movimientos"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "importacion-excel",
      "titulo": "Importación desde Excel",
      "tipo": "subcomponente",
      "ruta": "docs/inscripciones/inscripcion-binomios/importacion-excel.md",
      "padre": "inscripcion-binomios",
      "dominio": "inscripciones",
      "descripcion": "Plantilla, vista previa, duplicados y carga de binomios",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "participantes"
      ],
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
      "descripcion": "Indicadores de la sección 6.7 del marco en v1.0; KPIs ampliados en v1.1",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "movimientos",
        "inscripcion-binomios"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "formulario-inscripcion",
      "titulo": "Formulario de inscripción",
      "tipo": "subcomponente",
      "ruta": "docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md",
      "padre": "inscripcion-binomios",
      "dominio": "inscripciones",
      "descripcion": "Enlace de solo envío, solicitudes por revisar y autorización del apoderado",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "participantes"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "registro-sin-senal",
      "titulo": "Registro sin señal",
      "tipo": "subcomponente",
      "ruta": "docs/movimientos/movimientos/registro-sin-senal.md",
      "padre": "movimientos",
      "dominio": "movimientos",
      "descripcion": "Borrador local en el teléfono y cola de envío al volver la conexión",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "conciliacion-cartola",
      "titulo": "Conciliación con cartola",
      "tipo": "componente",
      "ruta": "docs/movimientos/conciliacion-cartola.md",
      "padre": "marco-general",
      "dominio": "movimientos",
      "descripcion": "Carga de cartola, cruce por monto, fecha y nombre, sugerencias con IA y confirmación",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "movimientos"
      ],
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
      "descripcion": "Vista consolidada de por cobrar y por pagar, y tareas de la comisión",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "movimientos",
        "inscripcion-binomios"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "exportacion-rendicion",
      "titulo": "Cierre y rendición",
      "tipo": "componente",
      "ruta": "docs/rendicion/exportacion-rendicion.md",
      "padre": "marco-general",
      "dominio": "rendicion",
      "descripcion": "Cierre del evento, informe de rendición y exportación a planilla y PDF",
      "estado": "pendiente",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "movimientos",
        "inscripcion-binomios"
      ],
      "version": "0.0",
      "actualizado": "2026-09-27"
    }
  ],
  "tareas": [
    {
      "id": "t-001",
      "descripcion": "Confirmar si el club emite boletas o facturas (en especial a auspiciadores)",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "marco-general",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-002",
      "descripcion": "Definir pruebas, categorías (incluidas las por edad y la fecha de corte), tarifas, descuentos, alojamiento y pensión",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "inscripcion-binomios",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-003",
      "descripcion": "Crear el proyecto en la cuenta Railway existente (Postgres + volumen)",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "marco-general",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-004",
      "descripcion": "Crear proyecto en Google Cloud y credenciales OAuth para el login con Google",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "acceso-roles",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-005",
      "descripcion": "Averiguar el banco de la cuenta que recibe las transferencias y el formato de su cartola",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "conciliacion-cartola",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-006",
      "descripcion": "Confirmar si habrá wifi en el club el día del evento",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "registro-sin-senal",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-007",
      "descripcion": "Verificar si el plan de Railway incluye copias de seguridad de la base y del volumen",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "marco-general",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-008",
      "descripcion": "Validar con el club el plazo de rendición de 30 días (hasta el 2026-12-21)",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "exportacion-rendicion",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-009",
      "descripcion": "Confirmar con el club si entregará un aporte inicial (fondos o saldo previo) a la comisión",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "organizacion-evento",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-010",
      "descripcion": "Conseguir el logo del club en PNG, JPEG o WebP (máx. 1 MB)",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "organizacion-evento",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-011",
      "descripcion": "Entregar los datos de la carga inicial: nombre del club y del evento, fechas, lugar y correos Google de los dos administradores",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "organizacion-evento",
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
| 2026-09-27 | 1.1 | Marco general aprobado (v1.0). Se agregan Participantes, Importación desde Excel, Formulario de inscripción, Registro sin señal y Conciliación con cartola; "Exportación para rendición" pasa a "Cierre y rendición"; se agrega la columna Fase; tareas t-005 a t-008 y se precisan t-002 y t-003 | Aprobación del marco general |
| 2026-09-27 | 1.2 | Organización y evento pasa a revisión (v0.1); se crea la carpeta `organizacion/`; tareas t-009 a t-011 | Borrador de Organización y evento |
| 2026-09-27 | 1.3 | Organización y evento aprobado (v1.0); marco general a v1.1 (§10.2 remite la lista de categorías a Organización y evento) | Aprobación de Organización y evento |
| 2026-09-27 | 1.4 | Esquema 1.1: las tareas agregan el campo `categoria` (`desarrollo` o `club`); la tabla de tareas se separa por categoría | Pedido de Rod para distinguir lo que configura él de lo que debe definir con el club |
