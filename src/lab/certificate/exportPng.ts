import { exportSize } from "./certificate.ts";

const FONT_VARS = ["--font-bai-jamjuree", "--font-dm-mono", "--font-caveat"] as const;

function resolvedFamilies() {
  const style = getComputedStyle(document.documentElement);
  return FONT_VARS.map((name) => ({ name, value: style.getPropertyValue(name).trim() }));
}

function firstFamily(value: string) {
  return value.split(",")[0].replace(/["']/g, "").trim();
}

function fontFaceRules() {
  const rules: { rule: CSSFontFaceRule; base: string }[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSFontFaceRule) rules.push({ rule, base: sheet.href ?? window.location.href });
    }
  }
  return rules;
}

function coversLatin(range: string) {
  if (!range) return true;
  return /U\+0+-0*FF\b/i.test(range) || /U\+0000-00FF/i.test(range);
}

async function toDataUrl(url: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const type = response.headers.get("content-type") ?? "font/woff2";
  return `data:${type};base64,${btoa(binary)}`;
}

async function embeddedFonts(families: string[]) {
  const wanted = new Set(families);
  const faces = fontFaceRules().filter(({ rule }) => {
    const family = firstFamily(rule.style.getPropertyValue("font-family"));
    return wanted.has(family) && coversLatin(rule.style.getPropertyValue("unicode-range"));
  });
  const css = await Promise.all(
    faces.map(async ({ rule, base }) => {
      const src = rule.style.getPropertyValue("src");
      const match = src.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match) return "";
      const data = await toDataUrl(new URL(match[1], base).href);
      const family = firstFamily(rule.style.getPropertyValue("font-family"));
      const weight = rule.style.getPropertyValue("font-weight") || "normal";
      const fontStyle = rule.style.getPropertyValue("font-style") || "normal";
      return `@font-face{font-family:"${family}";src:url(${data});font-weight:${weight};font-style:${fontStyle};}`;
    }),
  );
  return css.join("");
}

export async function certificateMarkup(svg: SVGSVGElement, width: number, height: number) {
  const families = resolvedFamilies();
  const css = await embeddedFonts(families.map((f) => firstFamily(f.value)).filter(Boolean));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("class");
  await Promise.all(
    Array.from(clone.querySelectorAll("image")).map(async (image) => {
      const href = image.getAttribute("href");
      if (!href || href.startsWith("data:")) return;
      image.setAttribute("href", await toDataUrl(new URL(href, window.location.href).href));
    }),
  );
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = css;
  clone.insertBefore(style, clone.firstChild);
  let markup = new XMLSerializer().serializeToString(clone);
  for (const { name, value } of families) {
    if (value) markup = markup.split(`var(${name})`).join(value.replace(/"/g, "'"));
  }
  return markup;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("certificate image failed to load"));
    image.src = src;
  });
}

export async function certificatePng(svg: SVGSVGElement, width?: number) {
  const size = exportSize(width);
  const markup = await certificateMarkup(svg, size.width, size.height);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(image, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png export failed");
  return blob;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
