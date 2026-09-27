import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

function main() {
  const sqlPath = path.resolve(process.cwd(), process.argv[2] || "prisma/migrations_initial.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`Archivo no encontrado: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf-8");
  const b64 = Buffer.from(sqlContent).toString("base64");
  console.log(`Subiendo SQL (${sqlContent.length} bytes, base64: ${b64.length} caracteres)...`);

  // Limpiar archivo temporal previo
  execSync('railway ssh -s Postgres "rm -f /tmp/migration.b64 /tmp/migration.sql"', { stdio: "inherit" });

  // Subir en chunks de 4000 caracteres
  const chunkSize = 4000;
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    execSync(`railway ssh -s Postgres "printf '%s' '${chunk}' >> /tmp/migration.b64"`);
  }

  console.log("Decodificando y ejecutando migración SQL en Railway Postgres...");
  execSync(
    'railway ssh -s Postgres "base64 -d /tmp/migration.b64 > /tmp/migration.sql && psql -U postgres -d railway -P pager=off -v ON_ERROR_STOP=1 -f /tmp/migration.sql && rm /tmp/migration.b64 /tmp/migration.sql"',
    { stdio: "inherit" }
  );

  console.log("¡Migración SQL ejecutada con éxito!");
}

main();
