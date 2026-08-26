import path from "node:path";
import { closePool, pool } from "../src/db.js";
import { importRecords } from "../src/etl/importRecords.js";
import { normalizeRecord, validateRecord } from "../src/etl/normalizeRecord.js";
import { readSpotifyFiles } from "../src/etl/readSpotifyFiles.js";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run import -- <file-or-directory>");
  process.exit(1);
}

async function runImport() {
  const rawRecords = await readSpotifyFiles(path.resolve(inputPath));
  const validRecords = [];
  const invalidRecords = [];

  for (const item of rawRecords) {
    const normalized = normalizeRecord(item.raw, item.sourceFile);
    const validation = validateRecord(normalized);

    if (validation.valid) {
      validRecords.push(normalized);
    } else {
      invalidRecords.push({
        sourceFile: item.sourceFile,
        errors: validation.errors,
        raw: item.raw
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const importSummary = await importRecords(client, validRecords);
    await client.query("COMMIT");

    console.log(JSON.stringify({
      scanned: rawRecords.length,
      valid: validRecords.length,
      invalid: invalidRecords.length,
      ...importSummary
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

runImport().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exitCode = 1;
});

