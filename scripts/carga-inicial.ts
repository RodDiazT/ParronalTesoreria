import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod";
import { normalizarNombre } from "../src/lib/utilidades";

const EsquemaCargaInicial = z.object({
  organizacion: z.object({
    nombre: z.string().min(3).max(120),
  }),
  evento: z.object({
    nombre: z.string().min(3).max(120),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD"),
    fechaTermino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD"),
    fechaReferenciaEdad: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD").optional().nullable(),
    lugar: z.string().max(200).optional().nullable(),
  }),
  administradores: z.array(z.string().email("Correo inválido")).min(1, "Debe haber al menos 1 administrador"),
});

const CATEGORIAS_INICIALES = [
  // Ingresos
  { nombre: "Auspicios", tipo: "ingreso", claveSistema: null, exigeContraparte: true, orden: 1 },
  { nombre: "Inscripciones", tipo: "ingreso", claveSistema: "inscripciones", exigeContraparte: false, orden: 2 },
  { nombre: "Alojamiento", tipo: "ingreso", claveSistema: null, exigeContraparte: false, orden: 3 },
  { nombre: "Pensión de caballos", tipo: "ingreso", claveSistema: null, exigeContraparte: false, orden: 4 },
  { nombre: "Venta de comida", tipo: "ingreso", claveSistema: null, exigeContraparte: false, orden: 5 },
  { nombre: "Aporte inicial", tipo: "ingreso", claveSistema: "aporte_inicial", exigeContraparte: false, orden: 6 },
  { nombre: "Otros ingresos", tipo: "ingreso", claveSistema: null, exigeContraparte: false, orden: 7 },
  // Gastos
  { nombre: "Pintura", tipo: "gasto", claveSistema: null, exigeContraparte: false, orden: 1 },
  { nombre: "Insumos", tipo: "gasto", claveSistema: null, exigeContraparte: false, orden: 2 },
  { nombre: "Equipamiento de equitación", tipo: "gasto", claveSistema: null, exigeContraparte: false, orden: 3 },
  { nombre: "Premios", tipo: "gasto", claveSistema: null, exigeContraparte: false, orden: 4 },
  { nombre: "Devoluciones", tipo: "gasto", claveSistema: "devoluciones", exigeContraparte: false, orden: 5 },
  { nombre: "Otros gastos", tipo: "gasto", claveSistema: null, exigeContraparte: false, orden: 6 },
] as const;

function generarCuid(): string {
  // Generador simple de identificadores únicos para SQL directo
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `c${ts}${rand}`;
}

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

async function main() {
  // Obtener ruta del archivo desde argumentos (--archivo <ruta>)
  const args = process.argv.slice(2);
  let archivoPath = "./carga-inicial.json";

  const idxArchivo = args.indexOf("--archivo");
  if (idxArchivo !== -1 && args[idxArchivo + 1]) {
    archivoPath = args[idxArchivo + 1];
  } else if (args[0] && !args[0].startsWith("--")) {
    archivoPath = args[0];
  }

  const fullPath = path.resolve(process.cwd(), archivoPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Archivo de carga no encontrado: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Leyendo datos desde: ${fullPath}`);
  const rawContent = fs.readFileSync(fullPath, "utf-8");
  const parsedJson = JSON.parse(rawContent);

  const datos = EsquemaCargaInicial.parse(parsedJson);

  if (datos.evento.fechaTermino < datos.evento.fechaInicio) {
    console.error("Error: La fecha de término no puede ser anterior a la de inicio.");
    process.exit(1);
  }

  const orgNombreNormalizado = normalizarNombre(datos.organizacion.nombre);

  // Verificar si la organización ya existe en la base de datos
  const checkSql = `SELECT id FROM organizacion WHERE nombre_normalizado = ${escapeSql(orgNombreNormalizado)};`;
  const resultCheck = execSync(
    `railway ssh -s Postgres "psql -U postgres -d railway -P pager=off -t -A -c \\"${checkSql}\\""`,
    { encoding: "utf-8" }
  ).trim();

  // Ignorar output de conexión de railway si existe
  const lineas = resultCheck.split("\n").map(l => l.trim()).filter(l => l && !l.includes("Connecting"));
  if (lineas.length > 0 && lineas[0].startsWith("c")) {
    console.log(`La organización "${datos.organizacion.nombre}" ya existe (ID: ${lineas[0]}).`);
    console.log("El script es idempotente y no realizó cambios.");
    process.exit(0);
  }

  console.log(`Creando organización "${datos.organizacion.nombre}" y datos iniciales...`);

  const sqlStatements: string[] = ["BEGIN;"];

  // 1. Organizacion
  const orgId = generarCuid();
  sqlStatements.push(`
    INSERT INTO organizacion (id, nombre, nombre_normalizado, version, creado_en, actualizado_en)
    VALUES (${escapeSql(orgId)}, ${escapeSql(datos.organizacion.nombre)}, ${escapeSql(orgNombreNormalizado)}, 1, NOW(), NOW());
  `);
  sqlStatements.push(`
    INSERT INTO registro_auditoria (id, organizacion_id, entidad, entidad_id, accion, despues, creado_en)
    VALUES (${escapeSql(generarCuid())}, ${escapeSql(orgId)}, 'Organizacion', ${escapeSql(orgId)}, 'crear',
      json_build_object('nombre', ${escapeSql(datos.organizacion.nombre)}), NOW());
  `);

  // 2. Evento
  const eventoId = generarCuid();
  sqlStatements.push(`
    INSERT INTO evento (id, organizacion_id, nombre, fecha_inicio, fecha_termino, fecha_referencia_edad, lugar, estado, version, creado_en, actualizado_en)
    VALUES (
      ${escapeSql(eventoId)},
      ${escapeSql(orgId)},
      ${escapeSql(datos.evento.nombre)},
      ${escapeSql(datos.evento.fechaInicio)}::date,
      ${escapeSql(datos.evento.fechaTermino)}::date,
      ${escapeSql(datos.evento.fechaReferenciaEdad || null)}::date,
      ${escapeSql(datos.evento.lugar || null)},
      'abierto',
      1,
      NOW(),
      NOW()
    );
  `);
  sqlStatements.push(`
    INSERT INTO registro_auditoria (id, organizacion_id, entidad, entidad_id, accion, despues, creado_en)
    VALUES (${escapeSql(generarCuid())}, ${escapeSql(orgId)}, 'Evento', ${escapeSql(eventoId)}, 'crear',
      json_build_object('nombre', ${escapeSql(datos.evento.nombre)}, 'estado', 'abierto'), NOW());
  `);

  // 3. Categorías iniciales (13)
  for (const cat of CATEGORIAS_INICIALES) {
    const catId = generarCuid();
    const catNombreNorm = normalizarNombre(cat.nombre);
    sqlStatements.push(`
      INSERT INTO categoria (id, organizacion_id, nombre, nombre_normalizado, tipo, clave_sistema, exige_contraparte, activa, orden, version, creado_en, actualizado_en)
      VALUES (
        ${escapeSql(catId)},
        ${escapeSql(orgId)},
        ${escapeSql(cat.nombre)},
        ${escapeSql(catNombreNorm)},
        '${cat.tipo}'::"TipoCategoria",
        ${escapeSql(cat.claveSistema)},
        ${cat.exigeContraparte ? "true" : "false"},
        true,
        ${cat.orden},
        1,
        NOW(),
        NOW()
      );
    `);
    sqlStatements.push(`
      INSERT INTO registro_auditoria (id, organizacion_id, entidad, entidad_id, accion, despues, creado_en)
      VALUES (${escapeSql(generarCuid())}, ${escapeSql(orgId)}, 'Categoria', ${escapeSql(catId)}, 'crear',
        json_build_object('nombre', ${escapeSql(cat.nombre)}, 'tipo', '${cat.tipo}'), NOW());
    `);
  }

  // 4. Administradores y Membresías
  for (const correoRaw of datos.administradores) {
    const correo = correoRaw.toLowerCase().trim();
    const usuarioId = generarCuid();
    const membresiaId = generarCuid();

    sqlStatements.push(`
      INSERT INTO usuario (id, correo, creado_en, actualizado_en)
      VALUES (${escapeSql(usuarioId)}, ${escapeSql(correo)}, NOW(), NOW())
      ON CONFLICT (correo) DO UPDATE SET actualizado_en = NOW()
      RETURNING id;
    `);

    // Usamos una consulta para asegurar el usuarioId sea el correcto si ya existía
    sqlStatements.push(`
      INSERT INTO membresia (id, organizacion_id, usuario_id, rol, estado, aprobada_en, version, creado_en, actualizado_en)
      VALUES (
        ${escapeSql(membresiaId)},
        ${escapeSql(orgId)},
        (SELECT id FROM usuario WHERE correo = ${escapeSql(correo)}),
        'administrador'::"Rol",
        'activa'::"EstadoMembresia",
        NOW(),
        1,
        NOW(),
        NOW()
      );
    `);

    sqlStatements.push(`
      INSERT INTO registro_auditoria (id, organizacion_id, entidad, entidad_id, accion, despues, creado_en)
      VALUES (${escapeSql(generarCuid())}, ${escapeSql(orgId)}, 'Membresia', ${escapeSql(membresiaId)}, 'crear',
        json_build_object('correo', ${escapeSql(correo)}, 'rol', 'administrador', 'estado', 'activa'), NOW());
    `);
  }

  sqlStatements.push("COMMIT;");

  const fullSql = sqlStatements.join("\n");
  const tempSqlFile = path.resolve(process.cwd(), "scratch/carga-inicial.tmp.sql");
  fs.mkdirSync(path.dirname(tempSqlFile), { recursive: true });
  fs.writeFileSync(tempSqlFile, fullSql, "utf-8");

  console.log("Ejecutando transacción de carga inicial en Railway Postgres...");
  execSync(`npx tsx scripts/ejecutar-sql-remoto.ts "${tempSqlFile}"`, { stdio: "inherit" });

  fs.unlinkSync(tempSqlFile);

  console.log("\n========================================================");
  console.log("¡Carga inicial completada exitosamente!");
  console.log(`Organización: ${datos.organizacion.nombre}`);
  console.log(`Evento: ${datos.evento.nombre} (${datos.evento.fechaInicio})`);
  console.log(`Administradores configurados: ${datos.administradores.join(", ")}`);
  console.log(`Categorías creadas: ${CATEGORIAS_INICIALES.length} categorías con claves de sistema`);
  console.log("========================================================\n");
}

main().catch(err => {
  console.error("Error durante la carga inicial:", err);
  process.exit(1);
});
