import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("   HARD RESET - AMBIENTE DE PRUEBAS PARRONAL      ");
  console.log("==================================================");

  // 1. Limpieza de tablas operativas dependientes
  console.log("\n--- Eliminando datos operativos ---");
  const pagos = await prisma.pago.deleteMany({});
  console.log(`✓ Pagos eliminados: ${pagos.count}`);

  const devoluciones = await prisma.devolucion.deleteMany({});
  console.log(`✓ Devoluciones eliminadas: ${devoluciones.count}`);

  const respaldos = await prisma.respaldo.deleteMany({});
  console.log(`✓ Respaldos eliminados: ${respaldos.count}`);

  const traspasos = await prisma.traspaso.deleteMany({});
  console.log(`✓ Traspasos eliminados: ${traspasos.count}`);

  const movimientos = await prisma.movimiento.deleteMany({});
  console.log(`✓ Movimientos eliminados: ${movimientos.count}`);

  const inscripciones = await prisma.inscripcion.deleteMany({});
  console.log(`✓ Inscripciones eliminadas: ${inscripciones.count}`);

  const binomios = await prisma.binomio.deleteMany({});
  console.log(`✓ Binomios eliminados: ${binomios.count}`);

  const pruebas = await prisma.prueba.deleteMany({});
  console.log(`✓ Pruebas eliminadas: ${pruebas.count}`);

  const jineteApoderados = await prisma.jineteApoderado.deleteMany({});
  console.log(`✓ Relaciones Jinete-Apoderado eliminadas: ${jineteApoderados.count}`);

  const apoderados = await prisma.apoderado.deleteMany({});
  console.log(`✓ Apoderados eliminados: ${apoderados.count}`);

  const jinetes = await prisma.jinete.deleteMany({});
  console.log(`✓ Jinetes eliminados: ${jinetes.count}`);

  const caballos = await prisma.caballo.deleteMany({});
  console.log(`✓ Caballos eliminados: ${caballos.count}`);

  const clubes = await prisma.club.deleteMany({});
  console.log(`✓ Clubes eliminados: ${clubes.count}`);

  const contrapartes = await prisma.contraparte.deleteMany({});
  console.log(`✓ Contrapartes eliminadas: ${contrapartes.count}`);

  const auditorias = await prisma.registroAuditoria.deleteMany({});
  console.log(`✓ Registros de auditoría previos eliminados: ${auditorias.count}`);

  // 2. Limpieza de categorías custom / no-sistema
  console.log("\n--- Limpieza estricta de categorías ---");
  // Borrar todas donde claveSistema es null o no es inscripciones/devoluciones
  const categoriasBorradas = await prisma.categoria.deleteMany({
    where: {
      OR: [
        { claveSistema: null },
        { claveSistema: { notIn: ["inscripciones", "devoluciones"] } },
      ],
    },
  });
  console.log(`✓ Categorías eliminadas (custom y no-sistema): ${categoriasBorradas.count}`);

  // 3. Limpieza de eventos y organizaciones sintéticas
  console.log("\n--- Limpieza de eventos y organizaciones secundarias ---");
  const orgOficial = await prisma.organizacion.findFirst({
    where: { nombreNormalizado: { contains: "parronal" } },
  });

  if (orgOficial) {
    await prisma.evento.deleteMany({
      where: {
        organizacionId: { not: orgOficial.id },
      },
    });
    await prisma.categoria.deleteMany({
      where: {
        organizacionId: { not: orgOficial.id },
      },
    });
    await prisma.organizacion.deleteMany({
      where: {
        id: { not: orgOficial.id },
      },
    });
  }

  const eventosTest = await prisma.evento.deleteMany({
    where: {
      OR: [
        { nombre: { contains: "Test" } },
        { nombre: { contains: "Aislamiento" } },
      ],
    },
  });
  console.log(`✓ Eventos de tests eliminados: ${eventosTest.count}`);

  // 4. Limpieza de usuarios sintéticos de tests automáticos (@test.cl, @club.cl)
  console.log("\n--- Limpieza de usuarios sintéticos de tests ---");
  const membresiasTest = await prisma.membresia.deleteMany({
    where: {
      usuario: {
        OR: [
          { correo: { endsWith: "@test.cl" } },
          { correo: { endsWith: "@club.cl" } },
        ],
      },
    },
  });
  console.log(`✓ Membresías de test eliminadas: ${membresiasTest.count}`);

  const usuariosTest = await prisma.usuario.deleteMany({
    where: {
      OR: [
        { correo: { endsWith: "@test.cl" } },
        { correo: { endsWith: "@club.cl" } },
      ],
    },
  });
  console.log(`✓ Usuarios de test eliminados: ${usuariosTest.count}`);

  // 5. Asegurar Organización, Evento y Categorías del Sistema
  console.log("\n--- Configuración de Organización y Categorías por Defecto ---");
  const org = orgOficial || await prisma.organizacion.findFirst();

  if (!org) {
    console.error("ERROR: No se encontró la organización principal.");
    process.exit(1);
  }

  // Asegurar o actualizar categoría "Inscripciones"
  await prisma.categoria.upsert({
    where: {
      organizacionId_claveSistema: {
        organizacionId: org.id,
        claveSistema: "inscripciones",
      },
    },
    update: {
      nombre: "Inscripciones",
      nombreNormalizado: "inscripciones",
      tipo: "ingreso",
      exigeContraparte: false,
      sujetoAsociado: "binomio_prueba",
      exigeSujeto: true,
      activa: true,
      orden: 0,
    },
    create: {
      organizacionId: org.id,
      nombre: "Inscripciones",
      nombreNormalizado: "inscripciones",
      tipo: "ingreso",
      claveSistema: "inscripciones",
      exigeContraparte: false,
      sujetoAsociado: "binomio_prueba",
      exigeSujeto: true,
      activa: true,
      orden: 0,
    },
  });
  console.log(`✓ Categoría "Inscripciones" configurada: tipo=ingreso, sujeto=binomio_prueba`);

  // Asegurar o actualizar categoría "Devoluciones"
  await prisma.categoria.upsert({
    where: {
      organizacionId_claveSistema: {
        organizacionId: org.id,
        claveSistema: "devoluciones",
      },
    },
    update: {
      nombre: "Devoluciones",
      nombreNormalizado: "devoluciones",
      tipo: "gasto",
      exigeContraparte: false,
      sujetoAsociado: null,
      exigeSujeto: false,
      activa: true,
      orden: 999,
    },
    create: {
      organizacionId: org.id,
      nombre: "Devoluciones",
      nombreNormalizado: "devoluciones",
      tipo: "gasto",
      claveSistema: "devoluciones",
      exigeContraparte: false,
      sujetoAsociado: null,
      exigeSujeto: false,
      activa: true,
      orden: 999,
    },
  });
  console.log(`✓ Categoría "Devoluciones" configurada: tipo=gasto`);

  // 6. Reporte Final
  console.log("\n==================================================");
  console.log("   ESTADO FINAL DE LA BASE DE DATOS               ");
  console.log("==================================================");

  const [
    conteoOrgs,
    conteoEventos,
    conteoUsuarios,
    conteoMembresias,
    conteoCategorias,
    conteoMovimientos,
    conteoInscripciones,
    conteoBinomios,
    conteoPruebas,
    conteoJinetes,
    conteoCaballos,
    conteoClubes,
  ] = await Promise.all([
    prisma.organizacion.count(),
    prisma.evento.count(),
    prisma.usuario.count(),
    prisma.membresia.count(),
    prisma.categoria.count(),
    prisma.movimiento.count(),
    prisma.inscripcion.count(),
    prisma.binomio.count(),
    prisma.prueba.count(),
    prisma.jinete.count(),
    prisma.caballo.count(),
    prisma.club.count(),
  ]);

  const categoriasFinales = await prisma.categoria.findMany({ select: { nombre: true, tipo: true, claveSistema: true } });
  const eventosFinales = await prisma.evento.findMany({ select: { nombre: true, estado: true } });
  const usuariosFinales = await prisma.usuario.findMany({ select: { correo: true, nombre: true } });

  console.log(`Organizaciones:   ${conteoOrgs}`);
  console.log(`Eventos:          ${conteoEventos} -> ${eventosFinales.map(e => `${e.nombre} (${e.estado})`).join(", ")}`);
  console.log(`Usuarios:         ${conteoUsuarios} -> ${usuariosFinales.map(u => `${u.nombre} <${u.correo}>`).join(", ")}`);
  console.log(`Membresías:       ${conteoMembresias}`);
  console.log(`Categorías:       ${conteoCategorias} -> ${categoriasFinales.map(c => `${c.nombre} [${c.tipo}]`).join(", ")}`);
  console.log(`Pruebas:          ${conteoPruebas}`);
  console.log(`Binomios:         ${conteoBinomios}`);
  console.log(`Inscripciones:    ${conteoInscripciones}`);
  console.log(`Movimientos:      ${conteoMovimientos}`);
  console.log(`Jinetes:          ${conteoJinetes}`);
  console.log(`Caballos:         ${conteoCaballos}`);
  console.log(`Clubes:           ${conteoClubes}`);
  console.log("==================================================");
  console.log("   ¡HARD RESET COMPLETADO CON ÉXITO!              ");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Error durante el Hard Reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
