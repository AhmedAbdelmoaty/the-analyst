import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const srcRoot = path.join(root, "src");
const publicRoot = path.join(root, "public");

const toPosix = (value) => value.split(path.sep).join("/");

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
};

const exists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

const sizeOf = async (file) => (await fs.stat(file)).size;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const replaceFile = async (source, candidate) => {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.rm(source, { force: true });
      await fs.rename(candidate, source);
      return;
    } catch (error) {
      lastError = error;
      await sleep(150 * (attempt + 1));
    }
  }
  throw lastError;
};

const replaceIfSmaller = async (source, candidate, minRatio = 0.995) => {
  const [sourceSize, candidateSize] = await Promise.all([sizeOf(source), sizeOf(candidate)]);
  if (candidateSize < sourceSize * minRatio) {
    await replaceFile(source, candidate);
    return { changed: true, before: sourceSize, after: candidateSize };
  }
  await fs.rm(candidate, { force: true });
  return { changed: false, before: sourceSize, after: sourceSize };
};

const codeFiles = async () => {
  const files = await walk(srcRoot);
  return files.filter((file) => /\.(ts|tsx|js|jsx|css|html)$/.test(file));
};

const replaceInCode = async (replacements) => {
  const files = await codeFiles();
  for (const file of files) {
    let text = await fs.readFile(file, "utf8");
    let next = text;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    if (next !== text) await fs.writeFile(file, next);
  }
};

const convertWavToMp3 = async () => {
  const voiceRoot = path.join(publicRoot, "voiceover");
  const wavFiles = (await walk(voiceRoot)).filter((file) => file.endsWith(".wav"));
  const replacements = [];
  let before = 0;
  let after = 0;

  for (const wav of wavFiles) {
    const mp3 = wav.replace(/\.wav$/i, ".mp3");
    before += await sizeOf(wav);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      wav,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "112k",
      mp3,
    ]);
    after += await sizeOf(mp3);
    await fs.rm(wav);

    const publicWav = "/" + toPosix(path.relative(publicRoot, wav));
    const publicMp3 = publicWav.replace(/\.wav$/i, ".mp3");
    replacements.push([publicWav, publicMp3]);
  }

  await replaceInCode(replacements);
  return { count: wavFiles.length, before, after };
};

const recompressMp3 = async () => {
  const soundRoot = path.join(publicRoot, "sounds");
  const mp3Files = (await walk(soundRoot)).filter((file) => file.endsWith(".mp3"));
  let changed = 0;
  let before = 0;
  let after = 0;

  for (const mp3 of mp3Files) {
    const temp = `${mp3}.tmp.mp3`;
    await execFileAsync(ffmpegPath, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      mp3,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "112k",
      temp,
    ]);
    const result = await replaceIfSmaller(mp3, temp, 0.98);
    before += result.before;
    after += result.after;
    if (result.changed) changed += 1;
  }

  return { count: mp3Files.length, changed, before, after };
};

const convertPngToWebp = async () => {
  const assetFiles = (await walk(path.join(srcRoot, "assets"))).filter((file) => file.endsWith(".png"));
  const replacements = [];
  let changed = 0;
  let before = 0;
  let after = 0;

  for (const png of assetFiles) {
    const webp = png.replace(/\.png$/i, ".webp");
    before += await sizeOf(png);
    await sharp(png).webp({ quality: 82, effort: 6 }).toFile(webp);
    const pngSize = await sizeOf(png);
    const webpSize = await sizeOf(webp);
    if (webpSize < pngSize * 0.95) {
      await fs.rm(png);
      const srcPng = toPosix(path.relative(srcRoot, png));
      const srcWebp = srcPng.replace(/\.png$/i, ".webp");
      replacements.push([`@/${srcPng}`, `@/${srcWebp}`]);
      changed += 1;
      after += webpSize;
    } else {
      await fs.rm(webp, { force: true });
      after += pngSize;
    }
  }

  await replaceInCode(replacements);
  return { count: assetFiles.length, changed, before, after };
};

const recompressWebp = async () => {
  const webpFiles = (await walk(path.join(srcRoot, "assets"))).filter((file) => file.endsWith(".webp"));
  let changed = 0;
  let before = 0;
  let after = 0;

  for (const webp of webpFiles) {
    const temp = `${webp}.tmp.webp`;
    const input = await fs.readFile(webp);
    await sharp(input).webp({ quality: 80, effort: 6 }).toFile(temp);
    const result = await replaceIfSmaller(webp, temp, 0.98);
    before += result.before;
    after += result.after;
    if (result.changed) changed += 1;
  }

  return { count: webpFiles.length, changed, before, after };
};

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

if (!ffmpegPath || !(await exists(ffmpegPath))) {
  throw new Error("ffmpeg-static binary was not found");
}

const results = [];
results.push(["voice wav->mp3", await convertWavToMp3()]);
results.push(["sound mp3 recompress", await recompressMp3()]);
results.push(["png->webp", await convertPngToWebp()]);
results.push(["webp recompress", await recompressWebp()]);

for (const [label, result] of results) {
  console.log(
    `${label}: ${result.changed ?? result.count}/${result.count} files, ${mb(result.before)} -> ${mb(result.after)}`,
  );
}
