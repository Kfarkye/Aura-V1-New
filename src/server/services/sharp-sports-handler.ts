import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AppLogger } from '../lib/logger';

export const handleSportsStream = async ({
  principal,
  userMessage,
  canonicalEntities,
  marketContext,
  systemInstruction,
  res
}: any) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.write(`\n\n> [!ERROR]\n> **Missing Gemini API Key**\n> Configure GEMINI_API_KEY to enable sports delegation.\n`);
      return;
    }
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const ai = (project && project !== 'gen-lang-client-0281999829') ? 
        new GoogleGenAI({ enterprise: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-west2' }) :
        new GoogleGenAI({ apiKey });
    
    // Define the strict explicit-state response schema
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        resolution_state: {
          type: Type.STRING,
          enum: ["LIVE_DATA", "NO_GAMES_SCHEDULED", "OFF_SEASON", "GROUNDING_FAULT"],
          description: "The explicit state of the sports domain for this query."
        },
        context_summary: {
          type: Type.STRING,
          description: "Narrative context explaining the state (e.g., 'The Lakers are off tonight.')."
        },
        games: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              home_team: { type: Type.STRING },
              away_team: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['PREGAME', 'LIVE', 'FINAL', 'DELAYED'] },
              home_score: { type: Type.NUMBER },
              away_score: { type: Type.NUMBER },
              clock_state: { type: Type.STRING, description: "e.g., 'Q3 12:00', 'Final', '7:00 PM ET'" }
            },
            required: ['home_team', 'away_team', 'status']
          },
          description: "Array of game data if LIVE_DATA is the state."
        }
      },
      required: ["resolution_state", "context_summary"]
    };

    const instruction = `
DOMAIN: AURA Sports Engine.
USER REALITY: Current Time: ${new Date().toISOString()}.
User Query: "${userMessage}"
Canonical Entities: ${JSON.stringify(canonicalEntities || [])}

MANDATE:
1. ALWAYS use the 'fetch_live_scoreboard' tool to get the actual reality.
2. DO NOT guess scores.
3. If the tool returns no games, set resolution_state to 'NO_GAMES_SCHEDULED'.
4. Map the raw API data strictly to your output schema.
`;
    
    // Add 8000ms timeout logic constraint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let text = '{}';
    try {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          temperature: 0.2,
          tools: [{
            functionDeclarations: [{
              name: 'fetch_live_scoreboard',
              description: 'Fetches real-time sports scores and schedules for a specific league (e.g., nba, nfl, mlb, nhl).',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  league: { type: Type.STRING, enum: ['nba', 'nfl', 'mlb', 'nhl'] }
                },
                required: ['league']
              }
            }]
          }]
        }
      });

      let response = await chat.sendMessage({ message: instruction, config: { signal: controller.signal } as any });
      
      let finalPayload: any = null;

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'fetch_live_scoreboard') {
          const { league } = call.args as any;
          const sportMap: Record<string, string> = {
              nba: 'basketball',
              nfl: 'football',
              mlb: 'baseball',
              nhl: 'hockey'
          };
          
          try {
            AppLogger.info(`Fetching physical API data for ${league}`);
            const apiLeague = typeof league === 'string' ? league.toLowerCase() : 'nba';
            const mappedSport = sportMap[apiLeague] || 'basketball';
            
            const fetchRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${mappedSport}/${apiLeague}/scoreboard`);
            if (!fetchRes.ok) throw new Error("API Fetch Error");
            const data = await fetchRes.json();
            
            const strippedData = data.events?.map((event: any) => {
              const home = event.competitions[0].competitors.find((c:any) => c.homeAway === 'home');
              const away = event.competitions[0].competitors.find((c:any) => c.homeAway === 'away');
              
              return {
                  name: event.name,
                  status: event.status.type.state, // 'pre', 'in', 'post'
                  clock: event.status.displayClock,
                  home_team: home?.team?.displayName || 'Unknown',
                  home_score: parseInt(home?.score) || null,
                  away_team: away?.team?.displayName || 'Unknown',
                  away_score: parseInt(away?.score) || null,
              };
            }) || [];

            if (strippedData.length > 0) {
               console.log("[SportsDomainService] Branch: LIVE_DATA");
               finalPayload = {
                 resolution_state: "LIVE_DATA",
                 context_summary: `Current scores and updates for the ${league.toUpperCase()}.`,
                 games: strippedData.map((g: any) => ({
                    home_team: g.home_team,
                    away_team: g.away_team,
                    status: g.status === 'in' ? 'LIVE' : g.status === 'pre' ? 'PREGAME' : 'FINAL',
                    home_score: g.home_score || 0,
                    away_score: g.away_score || 0,
                    clock_state: g.clock || 'N/A'
                 }))
               };
            } else {
               console.log("[SportsDomainService] Branch: NO_GAMES_SCHEDULED");
               finalPayload = {
                 resolution_state: "NO_GAMES_SCHEDULED",
                 context_summary: `No games currently scheduled for ${league.toUpperCase()}.`,
                 games: []
               };
            }
          } catch (fetchErr: any) {
             AppLogger.error("fetch_live_scoreboard error", fetchErr);
             console.log("[SportsDomainService] Branch: GROUNDING_FAULT");
             finalPayload = {
                resolution_state: "GROUNDING_FAULT",
                context_summary: "Sports telemetrics are currently experiencing atmospheric interference.",
                games: []
             };
          }
        }
      }
      
      // If no function call was made or finalPayload is still null, parse LLM text output
      if (!finalPayload) {
        try {
          const rawText = response.text || '{}';
          finalPayload = JSON.parse(rawText);
          
          if (!finalPayload.resolution_state) {
            console.log("[SportsDomainService] Branch: NO_GAMES_SCHEDULED (Fallback due to malformed output)");
            finalPayload = {
              resolution_state: "NO_GAMES_SCHEDULED",
              context_summary: finalPayload.context_summary || finalPayload.summary || "Unable to determine current schedule.",
              games: []
            };
          } else {
            console.log(`[SportsDomainService] Branch: ${finalPayload.resolution_state} (from LLM)`);
          }
        } catch (parseError) {
          console.log("[SportsDomainService] Branch: GROUNDING_FAULT (Parse Error)");
          finalPayload = {
            resolution_state: "GROUNDING_FAULT",
            context_summary: "Failed to parse telemetrics from the AI provider.",
            games: []
          };
        }
      }
      
      text = JSON.stringify(finalPayload);
      clearTimeout(timeoutId);
    } catch (apiError: any) {
      clearTimeout(timeoutId);
      AppLogger.error("Aura Sports Engine Error", apiError);
      console.log("[SportsDomainService] Branch: GROUNDING_FAULT (API Error)");
      // GRACEFUL DEGRADATION: If timeouts or API errors occur, fallback
      text = JSON.stringify({
        resolution_state: "GROUNDING_FAULT",
        context_summary: "Sports telemetrics are currently experiencing atmospheric interference.",
        games: []
      });
    }

    res.write(`\n\n[AURA_ARTIFACT type="sports"]\n${text}\n[/AURA_ARTIFACT]\n\n`);
  } catch (error: any) {
    res.write(`\n\n> [!WARNING]\n> **Sports Architect Unavailable**\n> Failed to synthesize sports layout. Fault: ${error.message}\n`);
  }
};
