import Link from "next/link";

export const metadata = {
  title: "Aviso de Privacidad · Tesorería",
  description: "Aviso de privacidad y tratamiento de datos personales del portal de tesorería",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-fondo py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-borde bg-superficie p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-borde pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-texto">
              Aviso de Privacidad
            </h1>
            <p className="text-xs text-texto-suave mt-0.5">
              Portal de Tesorería del Concurso Ecuestre
            </p>
          </div>
          <Link
            href="/ingresar"
            className="rounded-lg border border-borde bg-fondo px-3 py-1.5 text-xs font-medium text-texto hover:bg-superficie transition-colors"
          >
            ← Volver
          </Link>
        </div>

        <div className="space-y-6 text-sm text-texto leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              1. Responsable del Tratamiento
            </h2>
            <p className="text-texto-suave">
              El tratamiento de los datos personales en este portal es realizado por la
              comisión organizadora del concurso, a través de su administrador responsable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              2. Finalidad Única del Tratamiento
            </h2>
            <p className="text-texto-suave">
              Los datos se tratan con la finalidad exclusiva de administrar, registrar,
              controlar y rendir las operaciones financieras y de tesorería del evento
              ecuestre. No se emplean para prospección comercial ni se ceden a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              3. Datos Recolectados de los Usuarios del Portal
            </h2>
            <p className="text-texto-suave">
              Al ingresar mediante autenticación con Google, se almacenan: nombre, correo
              electrónico verificado e imagen de perfil de la cuenta de Google; mensaje
              opcional enviado al solicitar acceso; fecha y versión del aviso de privacidad
              aceptado; y un registro cronológico inmutable de las operaciones realizadas
              (ingresos, registros de movimientos, validaciones y cambios de rol) para
              garantizar la debida trazabilidad contable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              4. Datos de Terceros en el Portal
            </h2>
            <p className="text-texto-suave">
              El portal contiene asimismo datos de jinetes participantes, apoderados de
              menores de edad, clubes ecuestres, auspiciadores y proveedores, necesarios
              para la programación de pruebas, cálculo de inscripciones y respaldos de
              pago. Dichos datos son tratados bajo idénticos estándares de seguridad y
              confidencialidad.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              5. Encargado de Tratamiento y Procesamiento con IA
            </h2>
            <p className="text-texto-suave">
              Google LLC (a través de la API de Google Gemini en servicio de pago) actúa
              como encargado de tratamiento por cuenta de la comisión, procesando fuera
              de Chile parte de los datos de las planillas de inscripción que se importan
              (incluidos datos de menores de edad) y cartolas bancarias, exclusivamente con
              el propósito técnico de asistir en la estructuración de la información.
              Google no utiliza estos datos para entrenamiento de modelos ni para fines
              propios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              6. Plazo de Conservación
            </h2>
            <p className="text-texto-suave">
              Los datos se conservarán durante la preparación y ejecución del concurso, y
              hasta un año posterior a la fecha en que la asamblea del club apruebe
              formalmente la rendición de cuentas del evento, plazo tras el cual se
              procederá a su anonimización o supresión definitiva.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              7. Derechos de los Titulares
            </h2>
            <p className="text-texto-suave">
              Conforme a la Ley 19.628 y la Ley 21.719, todo titular tiene derecho a
              solicitar el acceso a sus datos personales, su rectificación cuando sean
              inexactos, su supresión cuando proceda, la oposición a tratamientos
              específicos y la portabilidad de su información. Para ejercer cualquiera de
              estos derechos, comunícate directamente con el administrador del evento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-texto mb-2">
              8. Formulario de Inscripción Externo
            </h2>
            <p className="text-texto-suave">
              Para los remitentes que envíen datos a través de formularios externos de
              inscripción, se recopilarán nombre, canal de contacto y comprobantes de pago.
              En caso de que una solicitud no resulte aceptada o sea desestimada, sus datos
              serán suprimidos en un plazo de 30 días.
            </p>
          </section>

          <section className="border-t border-borde pt-4">
            <p className="text-xs text-texto-suave">
              Vigencia normativa: Ley 19.628 y Ley 21.719 (en vigor desde el 2026-12-01).
              Aviso Versión 1 · Septiembre 2026.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
