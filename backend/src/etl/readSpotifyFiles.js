import fs from "node:fs/promises";
import path from "node:path";

async function readJsonFile(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(contents);

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} does not contain a JSON array`);
  }

  return parsed;
}

export async function readSpotifyFiles(inputPath) {
  const stats = await fs.stat(inputPath);
  const files = stats.isDirectory()
    ? (await fs.readdir(inputPath))
        .filter((file) => file.toLowerCase().endsWith(".json"))
        .map((file) => path.join(inputPath, file))
    : [inputPath];

  const records = [];

  for (const filePath of files) {
    const jsonRecords = await readJsonFile(filePath);
    const sourceFile = path.basename(filePath);

    for (const raw of jsonRecords) {
      records.push({ raw, sourceFile });
    }
  }

  return records;
}

