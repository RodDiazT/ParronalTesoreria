-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('abierto', 'cerrado', 'rendido');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('ingreso', 'gasto');

-- CreateEnum
CREATE TYPE "EstadoMembresia" AS ENUM ('solicitada', 'activa', 'revocada');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('administrador', 'ayudante', 'observador');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ingreso', 'gasto');

-- CreateEnum
CREATE TYPE "NaturalezaMovimiento" AS ENUM ('dinero', 'especie');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('transferencia', 'efectivo', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pagado', 'pendiente');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('por_validar', 'validado', 'observado');

-- CreateEnum
CREATE TYPE "RelacionApoderado" AS ENUM ('madre', 'padre', 'tutor_legal', 'otro_familiar', 'otro');

-- CreateEnum
CREATE TYPE "AplicaConcepto" AS ENUM ('binomio', 'participante');

-- CreateTable
CREATE TABLE "organizacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "logo_ruta" TEXT,
    "logo_tipo_mime" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_termino" DATE NOT NULL,
    "fecha_referencia_edad" DATE,
    "lugar" TEXT,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'abierto',
    "cerrado_en" TIMESTAMP(3),
    "rendido_en" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "clave_sistema" TEXT,
    "exige_contraparte" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contraparte" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "es_auspiciador" BOOLEAN NOT NULL DEFAULT false,
    "es_proveedor" BOOLEAN NOT NULL DEFAULT false,
    "contacto" TEXT,
    "rut" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fusionada_en_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contraparte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT,
    "imagen" TEXT,
    "correo_verificado_en" TIMESTAMP(3),
    "aviso_version" INTEGER,
    "aviso_aceptado_en" TIMESTAMP(3),
    "ultimo_ingreso_en" TIMESTAMP(3),
    "suprimido_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membresia" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "rol" "Rol",
    "estado" "EstadoMembresia" NOT NULL,
    "mensaje_solicitud" TEXT,
    "solicitada_en" TIMESTAMP(3),
    "invitada_por_id" TEXT,
    "aprobada_en" TIMESTAMP(3),
    "aprobada_por_id" TEXT,
    "revocada_en" TIMESTAMP(3),
    "revocada_por_id" TEXT,
    "motivo_revocacion" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membresia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "naturaleza" "NaturalezaMovimiento" NOT NULL DEFAULT 'dinero',
    "monto_clp" INTEGER NOT NULL,
    "monto_original_clp" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "fecha_pago" DATE,
    "medio_pago" "MedioPago",
    "estado_pago" "EstadoPago" NOT NULL,
    "categoria_id" TEXT,
    "sin_identificar" BOOLEAN NOT NULL DEFAULT false,
    "contraparte_id" TEXT,
    "pagado_por_id" TEXT,
    "nombre_origen" TEXT,
    "descripcion" TEXT,
    "observacion" TEXT,
    "sin_respaldo" BOOLEAN NOT NULL DEFAULT false,
    "estado_validacion" "EstadoValidacion" NOT NULL,
    "enviado_a_validar_por_id" TEXT,
    "validado_por_id" TEXT,
    "validado_en" TIMESTAMP(3),
    "comentario_observacion" TEXT,
    "abono_de_id" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "posterior_al_cierre" BOOLEAN NOT NULL DEFAULT false,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "clave_cliente" TEXT NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respaldo" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "es_comprobante_pago" BOOLEAN NOT NULL DEFAULT false,
    "subido_por_id" TEXT NOT NULL,
    "es_nuevo" BOOLEAN NOT NULL DEFAULT false,
    "visto_por_id" TEXT,
    "visto_en" TIMESTAMP(3),
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "contacto" TEXT,
    "rut" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fusionado_en_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jinete" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "contacto" TEXT,
    "rut" TEXT,
    "club_id" TEXT NOT NULL,
    "autorizacion_apoderado_fecha" DATE,
    "autorizacion_registrada_por_id" TEXT,
    "autorizacion_registrada_en" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fusionado_en_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jinete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apoderado" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "telefono" TEXT,
    "telefono_normalizado" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fusionado_en_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apoderado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jinete_apoderado" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "jinete_id" TEXT NOT NULL,
    "apoderado_id" TEXT NOT NULL,
    "relacion" "RelacionApoderado" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jinete_apoderado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caballo" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fusionado_en_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caballo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prueba" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "tarifa_clp" INTEGER NOT NULL,
    "edad_minima" INTEGER,
    "edad_maxima" INTEGER,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prueba_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepto" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "aplica_a" "AplicaConcepto" NOT NULL,
    "tarifa_clp" INTEGER NOT NULL,
    "unidad" TEXT,
    "categoria_referencia_id" TEXT,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "binomio" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "jinete_id" TEXT NOT NULL,
    "caballo_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "importacion_id" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "creado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "binomio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripcion" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "binomio_id" TEXT NOT NULL,
    "prueba_id" TEXT NOT NULL,
    "tarifa_clp" INTEGER NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "motivo_ajuste" TEXT,
    "aviso_pendiente" BOOLEAN NOT NULL DEFAULT false,
    "aviso_visto_por_id" TEXT,
    "aviso_visto_en" TIMESTAMP(3),
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "retirado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "clave_cliente" TEXT NOT NULL,
    "importacion_id" TEXT,
    "registrado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "concepto_id" TEXT NOT NULL,
    "binomio_id" TEXT,
    "jinete_id" TEXT,
    "club_id" TEXT,
    "automatico" BOOLEAN NOT NULL DEFAULT false,
    "cantidad" INTEGER NOT NULL,
    "tarifa_clp" INTEGER NOT NULL,
    "precio_unitario_clp" INTEGER NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "descripcion" TEXT,
    "motivo_ajuste" TEXT,
    "aviso_pendiente" BOOLEAN NOT NULL DEFAULT false,
    "aviso_visto_por_id" TEXT,
    "aviso_visto_en" TIMESTAMP(3),
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "retirado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "clave_cliente" TEXT NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "inscripcion_id" TEXT,
    "cargo_id" TEXT,
    "monto_clp" INTEGER NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "inscripcion_id" TEXT,
    "cargo_id" TEXT,
    "ingreso_id" TEXT,
    "monto_clp" INTEGER NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traspaso" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "desde" "MedioPago" NOT NULL,
    "hacia" "MedioPago" NOT NULL,
    "monto_clp" INTEGER NOT NULL,
    "observacion" TEXT,
    "archivo_ruta" TEXT,
    "archivo_tipo_mime" TEXT,
    "clave_cliente" TEXT NOT NULL,
    "posterior_al_cierre" BOOLEAN NOT NULL DEFAULT false,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "anulado_motivo" TEXT,
    "anulado_por_id" TEXT,
    "anulado_en" TIMESTAMP(3),
    "registrado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traspaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" TEXT NOT NULL,
    "organizacion_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_nombre_normalizado_key" ON "organizacion"("nombre_normalizado");

-- CreateIndex
CREATE INDEX "evento_organizacion_id_idx" ON "evento"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_organizacion_id_tipo_nombre_normalizado_key" ON "categoria"("organizacion_id", "tipo", "nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_organizacion_id_clave_sistema_key" ON "categoria"("organizacion_id", "clave_sistema");

-- CreateIndex
CREATE INDEX "contraparte_organizacion_id_nombre_normalizado_idx" ON "contraparte"("organizacion_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "contraparte_organizacion_id_rut_idx" ON "contraparte"("organizacion_id", "rut");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "membresia_organizacion_id_estado_idx" ON "membresia"("organizacion_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "membresia_organizacion_id_usuario_id_key" ON "membresia"("organizacion_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_provider_account_id_key" ON "account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_session_token_key" ON "session"("session_token");

-- CreateIndex
CREATE INDEX "movimiento_organizacion_id_evento_id_estado_validacion_idx" ON "movimiento"("organizacion_id", "evento_id", "estado_validacion");

-- CreateIndex
CREATE INDEX "movimiento_organizacion_id_evento_id_tipo_estado_pago_idx" ON "movimiento"("organizacion_id", "evento_id", "tipo", "estado_pago");

-- CreateIndex
CREATE INDEX "movimiento_organizacion_id_evento_id_fecha_idx" ON "movimiento"("organizacion_id", "evento_id", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_abono_de_id_idx" ON "movimiento"("abono_de_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_organizacion_id_clave_cliente_key" ON "movimiento"("organizacion_id", "clave_cliente");

-- CreateIndex
CREATE INDEX "respaldo_organizacion_id_movimiento_id_idx" ON "respaldo"("organizacion_id", "movimiento_id");

-- CreateIndex
CREATE INDEX "club_organizacion_id_nombre_normalizado_idx" ON "club"("organizacion_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "club_organizacion_id_rut_idx" ON "club"("organizacion_id", "rut");

-- CreateIndex
CREATE INDEX "jinete_organizacion_id_nombre_normalizado_idx" ON "jinete"("organizacion_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "jinete_organizacion_id_rut_idx" ON "jinete"("organizacion_id", "rut");

-- CreateIndex
CREATE INDEX "jinete_organizacion_id_club_id_idx" ON "jinete"("organizacion_id", "club_id");

-- CreateIndex
CREATE INDEX "apoderado_organizacion_id_nombre_normalizado_idx" ON "apoderado"("organizacion_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "apoderado_organizacion_id_telefono_normalizado_idx" ON "apoderado"("organizacion_id", "telefono_normalizado");

-- CreateIndex
CREATE INDEX "jinete_apoderado_organizacion_id_apoderado_id_idx" ON "jinete_apoderado"("organizacion_id", "apoderado_id");

-- CreateIndex
CREATE UNIQUE INDEX "jinete_apoderado_jinete_id_apoderado_id_key" ON "jinete_apoderado"("jinete_id", "apoderado_id");

-- CreateIndex
CREATE INDEX "caballo_organizacion_id_nombre_normalizado_idx" ON "caballo"("organizacion_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "caballo_organizacion_id_club_id_idx" ON "caballo"("organizacion_id", "club_id");

-- CreateIndex
CREATE INDEX "prueba_organizacion_id_evento_id_idx" ON "prueba"("organizacion_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "prueba_evento_id_nombre_normalizado_key" ON "prueba"("evento_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "concepto_organizacion_id_evento_id_idx" ON "concepto"("organizacion_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "concepto_evento_id_nombre_normalizado_key" ON "concepto"("evento_id", "nombre_normalizado");

-- CreateIndex
CREATE INDEX "binomio_organizacion_id_evento_id_idx" ON "binomio"("organizacion_id", "evento_id");

-- CreateIndex
CREATE INDEX "binomio_organizacion_id_jinete_id_idx" ON "binomio"("organizacion_id", "jinete_id");

-- CreateIndex
CREATE INDEX "binomio_organizacion_id_caballo_id_idx" ON "binomio"("organizacion_id", "caballo_id");

-- CreateIndex
CREATE INDEX "binomio_organizacion_id_club_id_idx" ON "binomio"("organizacion_id", "club_id");

-- CreateIndex
CREATE INDEX "inscripcion_organizacion_id_evento_id_idx" ON "inscripcion"("organizacion_id", "evento_id");

-- CreateIndex
CREATE INDEX "inscripcion_binomio_id_idx" ON "inscripcion"("binomio_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscripcion_organizacion_id_clave_cliente_prueba_id_key" ON "inscripcion"("organizacion_id", "clave_cliente", "prueba_id");

-- CreateIndex
CREATE INDEX "cargo_organizacion_id_evento_id_idx" ON "cargo"("organizacion_id", "evento_id");

-- CreateIndex
CREATE INDEX "cargo_binomio_id_idx" ON "cargo"("binomio_id");

-- CreateIndex
CREATE INDEX "cargo_jinete_id_idx" ON "cargo"("jinete_id");

-- CreateIndex
CREATE INDEX "cargo_club_id_idx" ON "cargo"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_organizacion_id_clave_cliente_concepto_id_key" ON "cargo"("organizacion_id", "clave_cliente", "concepto_id");

-- CreateIndex
CREATE INDEX "pago_organizacion_id_movimiento_id_idx" ON "pago"("organizacion_id", "movimiento_id");

-- CreateIndex
CREATE INDEX "pago_inscripcion_id_idx" ON "pago"("inscripcion_id");

-- CreateIndex
CREATE INDEX "pago_cargo_id_idx" ON "pago"("cargo_id");

-- CreateIndex
CREATE INDEX "devolucion_organizacion_id_movimiento_id_idx" ON "devolucion"("organizacion_id", "movimiento_id");

-- CreateIndex
CREATE INDEX "devolucion_inscripcion_id_idx" ON "devolucion"("inscripcion_id");

-- CreateIndex
CREATE INDEX "devolucion_cargo_id_idx" ON "devolucion"("cargo_id");

-- CreateIndex
CREATE INDEX "devolucion_ingreso_id_idx" ON "devolucion"("ingreso_id");

-- CreateIndex
CREATE INDEX "traspaso_organizacion_id_evento_id_idx" ON "traspaso"("organizacion_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "traspaso_organizacion_id_clave_cliente_key" ON "traspaso"("organizacion_id", "clave_cliente");

-- CreateIndex
CREATE INDEX "registro_auditoria_organizacion_id_entidad_entidad_id_idx" ON "registro_auditoria"("organizacion_id", "entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "registro_auditoria_organizacion_id_creado_en_idx" ON "registro_auditoria"("organizacion_id", "creado_en");

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraparte" ADD CONSTRAINT "contraparte_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraparte" ADD CONSTRAINT "contraparte_fusionada_en_id_fkey" FOREIGN KEY ("fusionada_en_id") REFERENCES "contraparte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraparte" ADD CONSTRAINT "contraparte_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_invitada_por_id_fkey" FOREIGN KEY ("invitada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_aprobada_por_id_fkey" FOREIGN KEY ("aprobada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresia" ADD CONSTRAINT "membresia_revocada_por_id_fkey" FOREIGN KEY ("revocada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_contraparte_id_fkey" FOREIGN KEY ("contraparte_id") REFERENCES "contraparte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_pagado_por_id_fkey" FOREIGN KEY ("pagado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_enviado_a_validar_por_id_fkey" FOREIGN KEY ("enviado_a_validar_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_abono_de_id_fkey" FOREIGN KEY ("abono_de_id") REFERENCES "movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_visto_por_id_fkey" FOREIGN KEY ("visto_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club" ADD CONSTRAINT "club_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club" ADD CONSTRAINT "club_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club" ADD CONSTRAINT "club_fusionado_en_id_fkey" FOREIGN KEY ("fusionado_en_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete" ADD CONSTRAINT "jinete_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete" ADD CONSTRAINT "jinete_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete" ADD CONSTRAINT "jinete_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete" ADD CONSTRAINT "jinete_autorizacion_registrada_por_id_fkey" FOREIGN KEY ("autorizacion_registrada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete" ADD CONSTRAINT "jinete_fusionado_en_id_fkey" FOREIGN KEY ("fusionado_en_id") REFERENCES "jinete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderado" ADD CONSTRAINT "apoderado_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderado" ADD CONSTRAINT "apoderado_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderado" ADD CONSTRAINT "apoderado_fusionado_en_id_fkey" FOREIGN KEY ("fusionado_en_id") REFERENCES "apoderado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete_apoderado" ADD CONSTRAINT "jinete_apoderado_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete_apoderado" ADD CONSTRAINT "jinete_apoderado_jinete_id_fkey" FOREIGN KEY ("jinete_id") REFERENCES "jinete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete_apoderado" ADD CONSTRAINT "jinete_apoderado_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "apoderado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jinete_apoderado" ADD CONSTRAINT "jinete_apoderado_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caballo" ADD CONSTRAINT "caballo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caballo" ADD CONSTRAINT "caballo_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caballo" ADD CONSTRAINT "caballo_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caballo" ADD CONSTRAINT "caballo_fusionado_en_id_fkey" FOREIGN KEY ("fusionado_en_id") REFERENCES "caballo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prueba" ADD CONSTRAINT "prueba_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prueba" ADD CONSTRAINT "prueba_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prueba" ADD CONSTRAINT "prueba_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_categoria_referencia_id_fkey" FOREIGN KEY ("categoria_referencia_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_jinete_id_fkey" FOREIGN KEY ("jinete_id") REFERENCES "jinete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_caballo_id_fkey" FOREIGN KEY ("caballo_id") REFERENCES "caballo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binomio" ADD CONSTRAINT "binomio_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_binomio_id_fkey" FOREIGN KEY ("binomio_id") REFERENCES "binomio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_prueba_id_fkey" FOREIGN KEY ("prueba_id") REFERENCES "prueba"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_aviso_visto_por_id_fkey" FOREIGN KEY ("aviso_visto_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_concepto_id_fkey" FOREIGN KEY ("concepto_id") REFERENCES "concepto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_binomio_id_fkey" FOREIGN KEY ("binomio_id") REFERENCES "binomio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_jinete_id_fkey" FOREIGN KEY ("jinete_id") REFERENCES "jinete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_aviso_visto_por_id_fkey" FOREIGN KEY ("aviso_visto_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_ingreso_id_fkey" FOREIGN KEY ("ingreso_id") REFERENCES "movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traspaso" ADD CONSTRAINT "traspaso_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traspaso" ADD CONSTRAINT "traspaso_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traspaso" ADD CONSTRAINT "traspaso_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traspaso" ADD CONSTRAINT "traspaso_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- -------------------------------------------------------------
-- Índices únicos parciales (v1.0)
-- -------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "evento_un_abierto" ON "evento" ("organizacion_id") WHERE "estado" = 'abierto';
CREATE UNIQUE INDEX IF NOT EXISTS "binomio_no_anulado" ON "binomio" ("evento_id", "jinete_id", "caballo_id") WHERE NOT "anulado";
CREATE UNIQUE INDEX IF NOT EXISTS "inscripcion_no_anulada" ON "inscripcion" ("binomio_id", "prueba_id") WHERE NOT "anulado";

-- -------------------------------------------------------------
-- Restricciones CHECK de dominio
-- -------------------------------------------------------------

-- Membresía
ALTER TABLE "membresia" ADD CONSTRAINT "check_membresia_activa_con_rol" CHECK ("estado" <> 'activa' OR "rol" IS NOT NULL);

-- Movimiento
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_monto" CHECK ("monto_clp" > 0 AND "monto_original_clp" >= "monto_clp");
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_pagado_fecha" CHECK ("estado_pago" <> 'pagado' OR "fecha_pago" IS NOT NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_dinero_medio" CHECK ("naturaleza" <> 'dinero' OR "estado_pago" <> 'pagado' OR "medio_pago" IS NOT NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_especie" CHECK ("naturaleza" <> 'especie' OR ("tipo" = 'ingreso' AND "medio_pago" IS NULL));
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_pagado_por" CHECK ("pagado_por_id" IS NULL OR "tipo" = 'gasto');
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_nombre_origen" CHECK ("nombre_origen" IS NULL OR "tipo" = 'ingreso');
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_categoria" CHECK ("categoria_id" IS NOT NULL OR ("sin_identificar" AND "tipo" = 'ingreso'));
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_validado_categoria" CHECK ("estado_validacion" <> 'validado' OR "categoria_id" IS NOT NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_sin_respaldo" CHECK (NOT "sin_respaldo" OR "observacion" IS NOT NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "check_movimiento_anulado" CHECK (NOT "anulado" OR ("motivo_anulacion" IS NOT NULL AND "anulado_por_id" IS NOT NULL));

-- Jinete
ALTER TABLE "jinete" ADD CONSTRAINT "check_jinete_autorizacion" CHECK (
  ("autorizacion_registrada_por_id" IS NULL AND "autorizacion_registrada_en" IS NULL AND "autorizacion_apoderado_fecha" IS NULL) OR
  ("autorizacion_registrada_por_id" IS NOT NULL AND "autorizacion_registrada_en" IS NOT NULL AND "autorizacion_apoderado_fecha" IS NOT NULL)
);

-- Prueba
ALTER TABLE "prueba" ADD CONSTRAINT "check_prueba_tarifa" CHECK ("tarifa_clp" >= 0);
ALTER TABLE "prueba" ADD CONSTRAINT "check_prueba_edades" CHECK ("edad_minima" IS NULL OR "edad_maxima" IS NULL OR "edad_minima" <= "edad_maxima");

-- Concepto
ALTER TABLE "concepto" ADD CONSTRAINT "check_concepto_tarifa" CHECK ("tarifa_clp" >= 0);

-- Inscripción
ALTER TABLE "inscripcion" ADD CONSTRAINT "check_inscripcion_monto" CHECK ("monto_clp" BETWEEN 0 AND 999999999);
ALTER TABLE "inscripcion" ADD CONSTRAINT "check_inscripcion_retirado" CHECK (NOT "retirado" OR "anulado");
ALTER TABLE "inscripcion" ADD CONSTRAINT "check_inscripcion_anulado" CHECK (NOT "anulado" OR ("motivo_anulacion" IS NOT NULL AND "anulado_por_id" IS NOT NULL));

-- Cargo
ALTER TABLE "cargo" ADD CONSTRAINT "check_cargo_cantidad" CHECK ("cantidad" BETWEEN 1 AND 999);
ALTER TABLE "cargo" ADD CONSTRAINT "check_cargo_monto" CHECK ("monto_clp" = "cantidad" * "precio_unitario_clp");
ALTER TABLE "cargo" ADD CONSTRAINT "check_cargo_sujeto" CHECK (
  (CASE WHEN "binomio_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "jinete_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "club_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);
ALTER TABLE "cargo" ADD CONSTRAINT "check_cargo_retirado" CHECK (NOT "retirado" OR "anulado");
ALTER TABLE "cargo" ADD CONSTRAINT "check_cargo_automatico" CHECK (NOT "automatico" OR "binomio_id" IS NOT NULL);

-- Pago
ALTER TABLE "pago" ADD CONSTRAINT "check_pago_monto" CHECK ("monto_clp" > 0);
ALTER TABLE "pago" ADD CONSTRAINT "check_pago_item" CHECK (
  (CASE WHEN "inscripcion_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "cargo_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Devolución
ALTER TABLE "devolucion" ADD CONSTRAINT "check_devolucion_monto" CHECK ("monto_clp" > 0);
ALTER TABLE "devolucion" ADD CONSTRAINT "check_devolucion_item" CHECK (
  (CASE WHEN "inscripcion_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "cargo_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "ingreso_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Traspaso
ALTER TABLE "traspaso" ADD CONSTRAINT "check_traspaso_monto" CHECK ("monto_clp" > 0);
ALTER TABLE "traspaso" ADD CONSTRAINT "check_traspaso_distintos" CHECK ("desde" <> "hacia");
ALTER TABLE "traspaso" ADD CONSTRAINT "check_traspaso_comprobante" CHECK ("archivo_ruta" IS NOT NULL OR ("observacion" IS NOT NULL AND length(trim("observacion")) > 0));
ALTER TABLE "traspaso" ADD CONSTRAINT "check_traspaso_anulado" CHECK ("anulado" = false OR ("anulado_motivo" IS NOT NULL AND "anulado_por_id" IS NOT NULL AND "anulado_en" IS NOT NULL));
