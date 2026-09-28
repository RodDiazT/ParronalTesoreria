# Índice Maestro — Tesorería Parronal

Última actualización: 2026-09-28

## Árbol de carpetas

```
docs/
├── _INDICE_MAESTRO.md
├── _ESTADO_PROYECTO.md
├── PLAN_IMPLEMENTACION.md
├── marco-general/
│   └── marco-general-proyecto.md
├── acceso/
│   └── acceso-roles.md
├── dashboard/
│   └── dashboard.md
├── inscripciones/
│   ├── inscripcion-binomios/
│   │   ├── formulario-inscripcion.md
│   │   └── importacion-excel.md
│   ├── inscripcion-binomios.md
│   └── participantes.md
├── interfaz/
│   └── ux-ui.md
├── movimientos/
│   └── movimientos.md
└── organizacion/
    └── organizacion-evento.md
```

Las carpetas de dominio (`acceso/`, `organizacion/`, `movimientos/`, `inscripciones/`, `dashboard/`, `rendicion/` y, desde UX/UI, `interfaz/`) se crean con el primer documento de cada una (borrador o aprobado). Los hijos van en una subcarpeta con el nombre del padre (por ejemplo, `inscripciones/inscripcion-binomios/`).

## Documentos

| Documento | Ruta | Descripción | Estado | Fase | Padre |
|---|---|---|---|---|---|
| Marco general | `docs/marco-general/marco-general-proyecto.md` | Raíz técnica: actores, permisos, modelo de dominio, reglas de negocio, stack, cumplimiento y plan | Aprobado (v1.7) | v1.0 | — |
| Organización y evento | `docs/organizacion/organizacion-evento.md` | Aislamiento, carga inicial, configuración del evento, categorías y contrapartes | Aprobado (v1.3) | v1.0 | Marco general |
| Acceso y roles | `docs/acceso/acceso-roles.md` | Login con Google, solicitudes, aprobación, roles, permisos y aviso de privacidad | Aprobado (v1.4) | v1.0 | Marco general |
| Movimientos | `docs/movimientos/movimientos.md` | Ingresos y gastos con respaldo u observación, validación, anulación, por cobrar y por pagar, reembolsos, especie y auditoría | Aprobado (v1.4) | v1.0 | Marco general |
| Participantes | `docs/inscripciones/participantes.md` | Jinetes, apoderados, caballos y clubes: datos, reglas de edad y apoderado, duplicados | Aprobado (v1.0) | v1.0 | Marco general |
| Inscripción de binomios | `docs/inscripciones/inscripcion-binomios.md` | Binomios, pruebas, cargos, tarifas, descuentos, pagos, asignación y devoluciones | Aprobado (v1.4) | v1.0 | Marco general |
| Importación desde Excel | `docs/inscripciones/inscripcion-binomios/importacion-excel.md` | Plantilla para terceros, cualquier planilla con mapeo asistido por IA, vista previa, duplicados y carga de binomios | Aprobado (v1.1) | v1.1 | Inscripción de binomios |
| Dashboard | `docs/dashboard/dashboard.md` | Inicio por rol, indicadores del marco §6.7, saldo por medio de pago y traspasos, avisos, "Lo mío" y resumen copiable en v1.0; % pagadas, por categoría, evolución y conciliación en v1.1 | Aprobado (v1.2) | v1.0 | Marco general |
| Formulario de inscripción | `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` | Enlace de solo envío, un binomio por solicitud con comprobante opcional, clubes autocompletados, revisión con vínculo a lo existente, aceptación con pago y autorización del apoderado | Aprobado (v1.0) | v1.1 | Inscripción de binomios |
| UX/UI | `docs/interfaz/ux-ui.md` | Navegación (menú y botón "+"), sistema visual con modo claro y oscuro, estados, montos, listas, fichas, formularios, inicio plegado e instalable | Aprobado (v1.0) | v1.0 | Marco general |
| Registro sin señal | `docs/movimientos/movimientos/registro-sin-senal.md` | Borrador local en el teléfono y cola de envío al volver la conexión | Pendiente | v1.1 | Movimientos |
| Conciliación con cartola | `docs/movimientos/conciliacion-cartola.md` | Carga de cartola, cruce por monto, fecha y nombre, sugerencias con IA y confirmación | Pendiente | v1.1 | Marco general |
| Pendientes | `docs/movimientos/pendientes.md` | Vista consolidada de por cobrar y por pagar, y tareas de la comisión | Pendiente | v1.1 | Marco general |
| Cierre y rendición | `docs/rendicion/exportacion-rendicion.md` | Cierre del evento, informe de rendición y exportación a planilla y PDF | Pendiente | v1.1 | Marco general |

Orden de trabajo de v1.0 (marco general, sección 12): Organización y evento + Acceso y roles → Movimientos → Participantes → Inscripción de binomios → Dashboard. Importación desde Excel pasó a v1.1 (marco v1.4). Con Dashboard y UX/UI aprobados, todos los documentos del núcleo v1.0 están aprobados.

## Tareas pendientes del responsable

Dos categorías: **Desarrollo** (lo que Rod configura o entrega para que el proyecto avance: cuentas, credenciales, datos de carga) y **Club** (lo que Rod debe conversar con el club para cerrar definiciones y configuraciones).

### Desarrollo

| Id | Tarea | Origen | Estado |
|---|---|---|---|
| t-003 | Crear el proyecto en la cuenta Railway existente (Postgres + volumen) | Marco general | Completada (2026-09-27) |
| t-004 | Crear proyecto en Google Cloud y credenciales OAuth para el login con Google | Acceso y roles | Completada (2026-09-27) |
| t-007 | Verificar si el plan de Railway incluye copias de seguridad de la base y del volumen | Marco general | Pendiente |
| t-011 | Entregar los datos de la carga inicial: nombre del club y del evento, fechas, lugar y correos Google de los dos administradores | Organización y evento | Completada (2026-09-27) |
| t-015 | Activar la facturación de la API de Gemini en el proyecto de Google Cloud, crear la clave, configurar una alerta de presupuesto de USD 5 y entregar la clave a Claude Code fuera del repositorio | Importación desde Excel | Pendiente |

### Club

| Id | Tarea | Origen | Estado |
|---|---|---|---|
| t-001 | Confirmar si el club emite boletas o facturas (en especial a auspiciadores) | Marco general | Pendiente |
| t-002 | Definir pruebas, categorías (incluidas las por edad y la fecha de corte), tarifas, cuota por binomio, descuentos, alojamiento y pensión | Inscripción de binomios | Pendiente |
| t-005 | Averiguar el banco de la cuenta que recibe las transferencias y el formato de su cartola | Conciliación con cartola | Pendiente |
| t-006 | Confirmar si habrá wifi en el club el día del evento | Registro sin señal | Pendiente |
| t-008 | Validar con el club el plazo de rendición de 30 días (hasta el 2026-12-21) | Cierre y rendición | Pendiente |
| t-009 | Confirmar con el club si entregará un aporte inicial (fondos o saldo previo) a la comisión | Organización y evento | Pendiente |
| t-010 | Conseguir el logo del club en PNG, JPEG o WebP (máx. 1 MB) | Organización y evento | Pendiente |
| t-012 | Acordar con el club cómo la comisión pide y guarda la autorización del apoderado para menores de 14 años (mensaje o papel firmado) | Participantes | Pendiente |
| t-013 | Acordar con el club la política de devolución por retiro: hasta cuándo se devuelve y cuánto se retiene | Inscripción de binomios | Pendiente |
| t-014 | Definir con el club cómo recibirán las inscripciones las otras comisiones o clubes y enviarles la plantilla | Importación desde Excel | Pendiente |
| t-016 | Definir con el club los datos de la cuenta para transferir que muestra el formulario de inscripción y hasta cuándo se reciben inscripciones por ese medio | Formulario de inscripción | Pendiente |

## Datos estructurados

<!-- CHECKLIST:INICIO -->
```json
{
  "schema_version": "1.1",
  "proyecto": {
    "nombre": "Tesorería Parronal",
    "repositorio": "github",
    "raiz": "https://github.com/RodDiazT/parronaltesoreria/tree/main/docs",
    "actualizado": "2026-09-28"
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
      "version": "1.7",
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
      "version": "1.3",
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
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "organizacion-evento"
      ],
      "version": "1.4",
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
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "acceso-roles",
        "organizacion-evento"
      ],
      "version": "1.4",
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
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "organizacion-evento"
      ],
      "version": "1.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "inscripcion-binomios",
      "titulo": "Inscripción de binomios",
      "tipo": "componente",
      "ruta": "docs/inscripciones/inscripcion-binomios.md",
      "padre": "marco-general",
      "dominio": "inscripciones",
      "descripcion": "Binomios, pruebas, cargos, tarifas, descuentos, pagos, asignación y devoluciones",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "participantes",
        "movimientos"
      ],
      "version": "1.4",
      "actualizado": "2026-09-27"
    },
    {
      "id": "importacion-excel",
      "titulo": "Importación desde Excel",
      "tipo": "subcomponente",
      "ruta": "docs/inscripciones/inscripcion-binomios/importacion-excel.md",
      "padre": "inscripcion-binomios",
      "dominio": "inscripciones",
      "descripcion": "Plantilla para terceros, cualquier planilla con mapeo asistido por IA, vista previa, duplicados y carga de binomios",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "participantes"
      ],
      "version": "1.1",
      "actualizado": "2026-09-27"
    },
    {
      "id": "dashboard",
      "titulo": "Dashboard",
      "tipo": "componente",
      "ruta": "docs/dashboard/dashboard.md",
      "padre": "marco-general",
      "dominio": "dashboard",
      "descripcion": "Inicio por rol, indicadores del marco §6.7, saldo por medio de pago y traspasos, avisos, \"Lo mío\" y resumen copiable en v1.0; % pagadas, por categoría, evolución y conciliación en v1.1",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "movimientos",
        "inscripcion-binomios",
        "participantes",
        "acceso-roles",
        "organizacion-evento"
      ],
      "version": "1.2",
      "actualizado": "2026-09-27"
    },
    {
      "id": "formulario-inscripcion",
      "titulo": "Formulario de inscripción",
      "tipo": "subcomponente",
      "ruta": "docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md",
      "padre": "inscripcion-binomios",
      "dominio": "inscripciones",
      "descripcion": "Enlace de solo envío, un binomio por solicitud con comprobante opcional, clubes autocompletados, revisión con vínculo a lo existente, aceptación con pago y autorización del apoderado",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.1",
      "dependencias": [
        "participantes",
        "importacion-excel",
        "movimientos"
      ],
      "version": "1.0",
      "actualizado": "2026-09-27"
    },
    {
      "id": "ux-ui",
      "titulo": "UX/UI",
      "tipo": "componente",
      "ruta": "docs/interfaz/ux-ui.md",
      "padre": "marco-general",
      "dominio": "interfaz",
      "descripcion": "Navegación (menú y botón \"+\"), sistema visual con modo claro y oscuro, estados, montos, listas, fichas, formularios, inicio plegado e instalable",
      "estado": "aprobado",
      "reemplazado_por": null,
      "fase": "v1.0",
      "dependencias": [
        "acceso-roles",
        "organizacion-evento",
        "movimientos",
        "participantes",
        "inscripcion-binomios",
        "dashboard"
      ],
      "version": "1.0",
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
      "descripcion": "Definir pruebas, categorías (incluidas las por edad y la fecha de corte), tarifas, cuota por binomio, descuentos, alojamiento y pensión",
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
      "estado": "completada",
      "creada": "2026-09-27",
      "cerrada": "2026-09-27"
    },
    {
      "id": "t-004",
      "descripcion": "Crear proyecto en Google Cloud y credenciales OAuth para el login con Google",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "acceso-roles",
      "estado": "completada",
      "creada": "2026-09-27",
      "cerrada": "2026-09-27"
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
      "estado": "completada",
      "creada": "2026-09-27",
      "cerrada": "2026-09-27"
    },
    {
      "id": "t-012",
      "descripcion": "Acordar con el club cómo la comisión pide y guarda la autorización del apoderado para menores de 14 años (mensaje o papel firmado)",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "participantes",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-013",
      "descripcion": "Acordar con el club la política de devolución por retiro: hasta cuándo se devuelve y cuánto se retiene",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "inscripcion-binomios",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-014",
      "descripcion": "Definir con el club cómo recibirán las inscripciones las otras comisiones o clubes y enviarles la plantilla",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "importacion-excel",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-015",
      "descripcion": "Activar la facturación de la API de Gemini en el proyecto de Google Cloud, crear la clave, configurar una alerta de presupuesto de USD 5 y entregar la clave a Claude Code fuera del repositorio",
      "categoria": "desarrollo",
      "responsable": "Rod",
      "origen": "importacion-excel",
      "estado": "pendiente",
      "creada": "2026-09-27",
      "cerrada": null
    },
    {
      "id": "t-016",
      "descripcion": "Definir con el club los datos de la cuenta para transferir que muestra el formulario de inscripción y hasta cuándo se reciben inscripciones por ese medio",
      "categoria": "club",
      "responsable": "Rod",
      "origen": "formulario-inscripcion",
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
| 2026-09-27 | 1.5 | Acceso y roles pasa a revisión (v0.2); se crea la carpeta `acceso/` | Borrador de Acceso y roles |
| 2026-09-27 | 1.6 | Organización y evento v1.1 en revisión: cierra puntos abiertos (fechas informativas, Devoluciones fuera del selector, referencias entre organizaciones, evento cerrado en solo lectura) | Revisión pedida por Rod |
| 2026-09-27 | 1.7 | Organización y evento aprobado (v1.1); se corrige la numeración del control de cambios (dos líneas 1.5) | Aprobación de Rod |
| 2026-09-27 | 1.8 | Acceso y roles aprobado (v1.0). Movimientos queda desbloqueado (depende de Acceso y roles y de Organización y evento) | Aprobación de Acceso y roles |
| 2026-09-27 | 1.9 | Movimientos pasa a revisión (v0.1); se crea la carpeta `movimientos/`. Al aprobarse, Organización y evento sube a v1.2 (marca `exigeContraparte` en `Categoria`) | Borrador de Movimientos |
| 2026-09-27 | 1.10 | Movimientos aprobado (v1.0); Organización y evento a v1.2 (marca `exigeContraparte` en `Categoria`). Quedan desbloqueados Participantes (ya lo estaba), Registro sin señal y Conciliación con cartola; Inscripción de binomios espera Participantes | Aprobación de Movimientos |
| 2026-09-27 | 1.11 | Participantes pasa a revisión (v0.1); se crea la carpeta `inscripciones/`; tarea t-012. Al aprobarse, el marco general sube a v1.2 (club obligatorio para jinete y caballo, menor sin apoderado como alerta, autorización de menores de 14 con fecha) | Borrador de Participantes |
| 2026-09-27 | 1.12 | Participantes aprobado (v1.0): fecha de nacimiento y contacto del jinete opcionales. Marco general a v1.2. Queda desbloqueada Inscripción de binomios (Participantes y Movimientos aprobados) | Aprobación de Participantes |
| 2026-09-27 | 1.13 | Inscripción de binomios pasa a revisión (v0.1); t-002 incluye la cuota por binomio; tarea t-013. Al aprobarse, el marco general sube a v1.3 (entidades `Prueba`, `Concepto`, `Cargo` y `Devolucion`; por cobrar con cargos) y Movimientos a v1.1 (cascada a devoluciones, aviso en categorías de referencia, `registrarMovimientoSistema`) | Borrador de Inscripción de binomios |
| 2026-09-27 | 1.14 | Inscripción de binomios aprobado (v1.0). Marco general a v1.3 y Movimientos a v1.1. Quedan desbloqueados Importación desde Excel, Dashboard, Formulario de inscripción, Pendientes y Cierre y rendición | Aprobación de Inscripción de binomios |
| 2026-09-27 | 1.15 | Importación desde Excel aprobado (v1.0), fase v1.1; se crea la carpeta `inscripciones/inscripcion-binomios/`. Marco general a v1.4 (importación a v1.1, entidad `Importacion`, IA con Gemini de pago), Acceso y roles a v1.1 (aviso de privacidad con encargado de IA) e Inscripción de binomios a v1.1 (`importacionId`, `inscribir` con transacción externa). Tareas t-014 (club) y t-015 (desarrollo). El núcleo v1.0 queda con Dashboard como único documento pendiente | Aprobación de Importación desde Excel |
| 2026-09-27 | 1.16 | Dashboard aprobado (v1.0) sin borrador previo, por pedido de Rod; se crea la carpeta `dashboard/`; dependencias de Dashboard: se agregan Participantes, Acceso y roles y Organización y evento. Marco general a v1.5 (entidad `Traspaso`, saldo por medio de pago en v1.0, KPIs de v1.1 en §6.7), Movimientos a v1.2 (filtros en la URL, `resumenPendientesDe` propio), Inscripción de binomios a v1.2 (pestaña en la URL) y Acceso y roles a v1.2 (acción `registrar_traspaso`). Todo el núcleo v1.0 queda documentado | Aprobación de Dashboard |
| 2026-09-27 | 1.17 | Formulario de inscripción pasa a revisión (v0.1); dependencias: se agregan Importación desde Excel y Movimientos; tarea t-016 (club). Al aprobarse, el marco general sube a v1.6, Inscripción de binomios, Movimientos y Acceso y roles a v1.3, e Importación desde Excel y Dashboard a v1.1 (sección 6 del borrador) | Borrador de Formulario de inscripción |
| 2026-09-27 | 1.18 | Formulario de inscripción aprobado (v1.0) con dos cambios de Rod: el apoderado no bloquea el envío (marca "Falta apoderado") y el club se autocompleta con los clubes activos. Marco general a v1.6, Inscripción de binomios, Movimientos y Acceso y roles a v1.3, Importación desde Excel y Dashboard a v1.1 | Aprobación de Formulario de inscripción |
| 2026-09-27 | 1.19 | UX/UI pasa a revisión (v0.1); nuevo dominio y carpeta `interfaz/`. Al aprobarse, el marco general sube a v1.7, Dashboard a v1.2, Movimientos, Acceso y roles e Inscripción de binomios a v1.4, y Organización y evento a v1.3 (sección 6 del borrador) | Borrador de UX/UI pedido por Rod |
| 2026-09-27 | 1.20 | UX/UI aprobado (v1.0) sin cambios. Marco general a v1.7, Dashboard a v1.2, Movimientos, Acceso y roles e Inscripción de binomios a v1.4, y Organización y evento a v1.3 | Aprobación de UX/UI |
| 2026-09-27 | 1.21 | Fase 1 y Fase 2 de implementación técnica completadas, verificadas con tests y desplegadas en Railway según PLAN_IMPLEMENTACION.md | Hito de desarrollo técnico |
| 2026-09-27 | 1.22 | Fases 3 (UX/UI base y Configuración), 4 (Movimientos y Validación) y 5 (Participantes) completadas y verificadas con 113 tests al 100% y build limpio de Next.js | Hito de desarrollo técnico |
| 2026-09-28 | 1.23 | Diagnóstico y revisión de implementación de Fase 6 (Inscripción de binomios, pruebas y pagos): se audita el estado del código fuente y se documentan componentes existentes vs pendientes en _ESTADO_PROYECTO.md, PLAN_IMPLEMENTACION.md e inscripcion-binomios.md | Revisión y diagnóstico de Fase 6 |
| 2026-09-28 | 1.24 | Fase 7 de implementación técnica completada: Dashboard por rol (`/`), motor de KPIs dinámicos, módulo de Traspasos (`/traspasos`), endpoint seguro y suite de tests con 126 pruebas totales pasando al 100% y build de Next.js limpio | Hito de desarrollo técnico (Fase 7) |
| 2026-09-28 | 1.25 | Fase 8 de implementación técnica completada: configuración de orquestación y despliegue en Railway (`railway.json`), endpoint de monitoreo `/api/health`, tests de integración integral (`fase8.test.ts`), total de 133 tests en 12 suites pasando al 100% y build de producción Next.js limpio | Hito de desarrollo técnico (Fase 8) |



