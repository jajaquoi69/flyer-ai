import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMsg = { role: "user" | "assistant"; content: string };
type Payload = {
  messages: ChatMsg[];
  userProfile?: string;
  currentMood?: string;
};

function buildSystem(userProfile: string, currentMood: string): string {
  const lines = [
    "Tu es Elia, un compagnon d'écoute psychologique bienveillant et empathique.",
    "",
    "Tu accompagnes cette personne avec chaleur et sans jugement, dans une approche centrée sur elle.",
    "Tu utilises l'écoute active, la reformulation et des questions ouvertes pour l'aider à explorer ses pensées et émotions.",
    "",
    "Tes règles :",
    "- Réponds TOUJOURS en français",
    "- Réponses concises (2–4 phrases) sauf si plus de profondeur est nécessaire",
    "- Ne donne pas de conseils directifs ; aide la personne à trouver ses propres réponses",
    "- Valide les émotions avant de proposer des perspectives",
    "- Fais référence aux éléments partagés précédemment pour montrer que tu te souviens",
    "- Termine souvent par une question douce pour maintenir le dialogue",
    "- En cas de détresse sévère ou de pensées suicidaires, recommande le 3114 (France) ou les services d'urgence",
    "",
    "⚠️ Tu n'es pas un professionnel de santé certifié. Tu es un espace d'écoute et de soutien.",
  ];

  if (userProfile) {
    lines.push("", "Ce que tu sais sur cette personne :", userProfile);
  } else {
    lines.push(
      "",
      "C'est votre première rencontre. Présente-toi chaleureusement en une phrase et invite la personne à parler."
    );
  }

  if (currentMood) {
    lines.push(
      "",
      `Humeur actuelle de la personne : ${currentMood}`,
      "Accueille cette humeur avec empathie dès le début de ta réponse."
    );
  }

  return lines.join("\n");
}

function makeClient() {
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: "llama-3.3-70b-versatile",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o" };
  }
  return null;
}

export async function POST(req: Request) {
  const api = makeClient();
  if (!api) {
    return Response.json(
      { error: "Aucune clé API configurée. Ajoute GROQ_API_KEY (gratuit) ou OPENAI_API_KEY dans .env.local" },
      { status: 500 }
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages = [], userProfile = "", currentMood = "" } = body;
  const { client, model } = api;
  const system = buildSystem(userProfile, currentMood);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
          max_tokens: 450,
          temperature: 0.85,
        });
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(enc.encode(text));
        }
      } catch (err) {
        console.error("therapist stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
