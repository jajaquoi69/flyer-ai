import OpenAI from "openai";

export const runtime = "nodejs";

type MsgItem = { role: string; content: string };
type Payload = { messages: MsgItem[]; existingProfile?: string };

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const { messages = [], existingProfile = "" }: Payload = await req.json();

  const convo = messages
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Elia"}: ${m.content}`)
    .join("\n");

  const userPrompt = existingProfile
    ? `Profil existant :\n${existingProfile}\n\nNouvelle conversation :\n${convo}\n\nMets à jour le profil en intégrant les nouvelles informations (max 250 mots). Inclus : prénom si mentionné, situation de vie, préoccupations principales, émotions récurrentes, points forts, défis, progrès notés.`
    : `Conversation :\n${convo}\n\nRésume ce que tu as appris sur cette personne (max 200 mots). Inclus : prénom si mentionné, situation de vie, préoccupations principales, émotions, moments importants partagés.`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu résumes des informations sur une personne pour aider un compagnon d'écoute IA à mieux la connaître. Sois factuel, bienveillant et structuré.",
      },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 350,
    temperature: 0.3,
  });

  const summary = completion.choices[0]?.message?.content ?? "";
  return Response.json({ summary });
}
