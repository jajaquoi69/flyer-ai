import sharp from "sharp";
export const runtime = "nodejs";

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) throw new Error("Invalid data URL");
  return Buffer.from(m[1], "base64");
}

function toDataUrl(buf: Buffer) {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const { imageDataUrl } = (await req.json()) as { imageDataUrl: string };
    const input = parseDataUrl(imageDataUrl);

    // Post IG 4:5
    const post = await sharp(input)
      .resize(1080, 1350, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    // Story 9:16
    const story = await sharp(input)
      .resize(1080, 1920, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    return Response.json({
      postDataUrl: toDataUrl(post),
      storyDataUrl: toDataUrl(story),
    });
  } catch (err: any) {
    console.error("export-formats error:", err);
    return Response.json(
      { error: err?.message || "Export failed" },
      { status: 500 }
    );
  }
}
