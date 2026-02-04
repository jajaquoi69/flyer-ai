import OpenAI from "openai";

export const runtime = "nodejs";

type Payload = {
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  venue: string;
  city?: string;
  price?: string;
  cta?: string;
  vibe?: string;
  mode?: "fast" | "premium";
};

function buildPrompt(p: Payload) {
  const vibe = (p.vibe && p.vibe.trim()) || "nightclub event poster";

  // IMPORTANT: on liste le texte EXACT
  const textBlock = [
    `TITLE: "${p.title}"`,
    p.subtitle ? `SUBTITLE: "${p.subtitle}"` : null,
    `DATE: "${p.date}"`,
    p.time ? `TIME: "${p.time}"` : null,
    `VENUE: "${p.venue}"`,
    p.city ? `CITY: "${p.city}"` : null,
    p.price ? `PRICE: "${p.price}"` : null,
    p.cta ? `CTA: "${p.cta}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Create a FULL nightlife event flyer poster (final artwork) in French.",
    "Style must follow the user's vibe as the primary art direction.",
    `User vibe / style: ${vibe}.`,
    "Generate 4 DISTINCT design variations (composition, colors, motifs, typography style) while respecting the user's vibe.",
    "Each image must be a SINGLE poster (no collage, no grid, no multi-panel). One design per image.",
    "Strictly forbid multi-tile or split layouts: no 2-up, 3-up, 4-up, montage, photo grid or repeated mini posters.",
    "Full-bleed single composition only; one focal layout per image.",
    "Ensure the 4 variations differ clearly from each other: change color palette, layout, focal subject/illustration, and typography treatment between images.",
    "Avoid producing near-duplicates; make each variation visibly unique at a glance.",
    "Each image must be a SINGLE poster (no collage, no grid, no multi-panel). One design per image.",
    "Use bold typography and clear hierarchy (title biggest).",
    "VERY IMPORTANT: Render the following text EXACTLY as provided. Do not alter numbers, accents, or casing.",
    "Do not add any extra words beyond the provided text.",
    "High readability and strong contrast. No typos.",
    "Keep date/time/venue/price/cta in a clean readable font block for OCR.",
    "All critical text must stay inside a centered 4:5 safe area (it will be cropped to Instagram post 4:5).",
    "TEXT TO RENDER (exact):",
    textBlock,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as Payload;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = buildPrompt(body);
    const quality = body.mode === "premium" ? "high" : "medium";

    const res = await client.images.generate({
      model: "gpt-image-1.5",
      prompt,
      n: 4,
      size: "1024x1536",
      quality,
      output_format: "png",
    });

    const images =
      res.data?.map((img) => `data:image/png;base64,${img.b64_json}`) ?? [];

    if (images.length === 0) {
      return Response.json({ error: "No images returned from API" }, { status: 502 });
    }

    return Response.json({ images }, { status: 200 });
  } catch (err: any) {
    console.error("flyer-full error:", err);
    return Response.json(
      { error: err?.message || "Generation failed" },
      { status: err?.status || 500 }
    );
  }
}
