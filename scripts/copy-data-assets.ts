import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const assetPairs = [
  {
    from: path.join("src", "game", "data"),
    to: path.join("dist", "src", "game", "data"),
    extensions: new Set([".json"]),
  },
  {
    from: path.join("src", "ai", "prompts"),
    to: path.join("dist", "src", "ai", "prompts"),
    extensions: new Set([".md"]),
  },
] as const;

for (const pair of assetPairs) {
  await mkdir(pair.to, { recursive: true });
  const entries = await readdir(pair.from, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() && pair.extensions.has(path.extname(entry.name))
      )
      .map((entry) =>
        copyFile(
          path.join(pair.from, entry.name),
          path.join(pair.to, entry.name)
        )
      )
  );
}
