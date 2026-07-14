import { promises as fs } from "node:fs";

export async function safeReadJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}
