export const runtime = "nodejs";

type Expected = {
  title?: string;
  date: string;
  time?: string;
  venue: string;
  city?: string;
  price?: string;
  cta?: string;
};

function extractBase64(dataUrl: string) {
  const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) throw new Error("Invalid data URL");
  return m[1];
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève accents
    .replace(/\s+/g, " ")
    .trim();
}

function containsLoose(haystack: string, needle: string) {
  if (!needle) return true;
  const h = normalize(haystack);
  const n = normalize(needle);

  // tolérance espaces / retours
  if (h.includes(n)) return true;
  return h.replace(/\s/g, "").includes(n.replace(/\s/g, ""));
}

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      return Response.json({ error: "Missing GOOGLE_VISION_API_KEY" }, { status: 500 });
    }

    const { imageDataUrl, expected } = (await req.json()) as {
      imageDataUrl: string;
      expected: Expected;
    };

    const content = extractBase64(imageDataUrl);

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["fr"] },
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const t = await visionRes.text().catch(() => "");
      return Response.json({ error: `Vision error ${visionRes.status}: ${t}` }, { status: 502 });
    }

    const data = await visionRes.json();
    const first = data?.responses?.[0] ?? {};

    const text =
      first?.fullTextAnnotation?.text ||
      first?.textAnnotations?.[0]?.description ||
      "";

    const missing: string[] = [];

    // MVP: checks critiques
    if (!containsLoose(text, expected.date)) missing.push("date");
    if (!containsLoose(text, expected.venue)) missing.push("lieu");

    if (expected.time && !containsLoose(text, expected.time)) missing.push("heure");
    if (expected.price && !containsLoose(text, expected.price)) missing.push("prix");
    if (expected.cta && !containsLoose(text, expected.cta)) missing.push("cta");

    // (Optionnel) titre en "soft check" plus tard, car parfois stylisé
    // if (expected.title && !containsLoose(text, expected.title)) missing.push("titre");

    return Response.json({
      text,
      isValid: missing.length === 0,
      missing,
    });
  } catch (err: any) {
    console.error("verify-ocr error:", err);
    return Response.json({ error: err?.message || "OCR failed" }, { status: 500 });
  }
}
