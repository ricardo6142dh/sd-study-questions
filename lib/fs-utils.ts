import { promises as fs } from "node:fs";
import { cache } from "react";

const cachedReadJson = cache(async (filePath: string) => {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
});

export async function safeReadJson<T>(filePath: string): Promise<T> {
  return cachedReadJson(filePath) as Promise<T>;
}
