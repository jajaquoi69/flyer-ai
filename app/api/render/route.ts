import { chromium } from "playwright";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FlyerPayload = {
  backgroundUrl?: string;
  backgroundDataUrl?: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: string;
  cta: string;
};

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1350;

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const renderHtml = (payload: FlyerPayload, background: string) => {
  const {
    title,
    subtitle,
    date,
    time,
    venue,
    city,
    price,
    cta,
  } = payload;

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: ${BASE_WIDTH}px;
        height: ${BASE_HEIGHT}px;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        position: relative;
        color: #f8fafc;
        overflow: hidden;
        background: #0b1020;
      }
      .bg {
        position: absolute;
        inset: 0;
        background: url("${background}") center/cover no-repeat;
        filter: saturate(1.05);
        z-index: 1;
      }
      .overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 2;
      }
      .gradient-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 40%;
        background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.95) 100%);
        z-index: 3;
      }
      .content {
        position: relative;
        z-index: 4;
        height: 100%;
        padding: 48px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .badge {
        font-size: 11px;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: rgba(248,250,252,0.7);
      }
      h1 {
        font-size: 52px;
        line-height: 1.05;
        margin: 14px 0 10px;
        text-shadow: 0 10px 30px rgba(0,0,0,0.35);
      }
      .subtitle {
        font-size: 20px;
        line-height: 1.4;
        color: rgba(248,250,252,0.9);
        max-width: 92%;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .detail {
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        border-radius: 14px;
        padding: 12px 14px;
        backdrop-filter: blur(6px);
      }
      .detail .label {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(248,250,252,0.6);
        margin-bottom: 4px;
      }
      .detail .value {
        font-size: 16px;
        font-weight: 600;
      }
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 14px 18px;
        backdrop-filter: blur(8px);
      }
      .price { font-size: 22px; font-weight: 700; }
      .cta {
        background: #ffffff;
        color: #0b1020;
        border: none;
        border-radius: 12px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="bg"></div>
    <div class="overlay"></div>
    <div class="gradient-bottom"></div>
    <div class="content">
      <div>
        <div class="badge">Night Session</div>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
      </div>

      <div>
        <div class="grid">
          <div class="detail"><div class="label">Date</div><div class="value">${date}</div></div>
          <div class="detail"><div class="label">Heure</div><div class="value">${time}</div></div>
          <div class="detail"><div class="label">Lieu</div><div class="value">${venue}</div></div>
          <div class="detail"><div class="label">Ville</div><div class="value">${city}</div></div>
        </div>
        <div style="height:12px;"></div>
        <div class="footer">
          <div class="price">${price}</div>
          <div class="cta">${cta}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
};

export async function POST(request: Request) {
  let browser;
  try {
    const payload = (await request.json()) as FlyerPayload;
    const baseUrl = getBaseUrl();
    const backgroundUrl =
      payload.backgroundDataUrl?.trim() ||
      new URL(payload.backgroundUrl || "/bg.jpg", baseUrl).toString();

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: BASE_WIDTH, height: BASE_HEIGHT },
    });

    await page.setContent(renderHtml(payload, backgroundUrl), {
      waitUntil: "networkidle",
    });

    const buffer = await page.screenshot({ fullPage: true, type: "png" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="flyer.png"',
      },
    });
  } catch (error) {
    console.error("Render error", error);
    return NextResponse.json(
      { error: "Unable to render flyer" },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
