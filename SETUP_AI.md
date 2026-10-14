# Activer l'assistant IA (messages + préparation d'entretien)

Deux options, une seule suffit. La fonction choisit toute seule celle dont le secret existe.

## Option gratuite : Google Gemini
1. Va sur aistudio.google.com/apikey, connecte-toi avec ton compte Google, clique sur **Create API key** et copie la clé.
2. Dans Supabase, **Edge Functions**, ouvre `ai-assistant`, remplace le code par `edge-function-ai-assistant.ts`, puis **Deploy updates**.
3. Dans Edge Functions, **Secrets**, ajoute `GEMINI_API_KEY` avec ta clé, puis **Save**.
4. Teste sur ton site : la page **AI Assistant** du menu, choisis une candidature, puis **Generate message**.

L'offre gratuite a des limites d'utilisation et ses conditions peuvent changer : vérifie-les sur le site de Google. N'envoie pas d'informations privées.

## Option payante : Claude (API Anthropic)
Crée une clé sur console.anthropic.com (crédit prépayé) et ajoute-la dans les secrets sous le nom `ANTHROPIC_API_KEY`.

La clé API ne doit JAMAIS apparaître dans le site, dans GitHub ni dans un message.
