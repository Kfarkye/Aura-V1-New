# Spotify: Building with AI (Aura Integration Guide)

This guide documents the core guidelines, prompts, and architectural recommendations presented in the official Spotify Developer Tutorial: **Building with AI**. Use these specifications to align Aura's zero-trust Music Control Plane with optimized generative AI agents.

---

## 1. Overview
The Spotify Web API can be adapted for large language models (LLMs) and conversational assistants. To prevent token bloat and hallucination, Spotify recommends deploying **optimized subsets** of the OpenAPI specification. This allows agents to seamlessly translate natural user intent into high-fidelity music manipulation.

---

## 2. Recommended System Prompt
For conversational agents orchestrating the music layer, the following prompt maintains context alignment and enforces strict failure mode boundaries:

```text
You are a helpful Spotify Assistant matching Aura's zero-trust music control plane.
1. Translating Intent: Turn fuzzy human desires (e.g., "moody electronic to focus") into optimal query strings.
   * "Chill deep house" -> q=genre:"deep house" chill
   * "Warm acoustic" -> q=acoustic warm
2. Searching Before Play: Always perform GET /v1/search first to fetch tracks. Obtain the exact URI (spotify:track:ID) before issuing play commands.
3. No Active Device (404) Fallback: If Spotify's API returns a 404 No Active Device fault, gracefully state:
   "Your Spotify output is currently inactive. Please open the Spotify application on any device, hit play on any track to register your output, and ask me again."
```

---

## 3. Core Core API Scope
Spotify’s "Building with AI" OpenAPI targets these high-frequency endpoints:

| Action | Path | Description | Scope Required |
| :--- | :--- | :--- | :--- |
| **Search** | `GET /v1/search` | Locates matching tracks / playlists | None (General Token) |
| **Play** | `PUT /v1/me/player/play` | Launches playback of track URIs | `user-modify-playback-state` |
| **Pause** | `PUT /v1/me/player/pause` | Pauses active session | `user-modify-playback-state` |
| **Skip** | `POST /v1/me/player/next` | Skips to the next track | `user-modify-playback-state` |
| **Currently Playing**| `GET /v1/me/player/currently-playing` | Fetches active track & state | `user-read-currently-playing` |

---

## 4. Aura Implementation Alignments
Aura fulfills these standards using a secure server-side proxy architecture:
* **Token Sandboxing**: Raw authorization keys and oauth refresh flows are strictly isolated in server memory (`/src/server/routes/music.ts`). Zero tokens traverse the public browser network.
* **Audit-Evidence Receipts**: Playback dispatches generate immutable, receipt-backed logs (`AuraReceipt`) on the local timeline (`Activity`).
* **Active Device Redirection**: When physical player outputs are idle, Aura activates a custom **Virtual Soundport** wrapper to simulate telemetry and progress dynamically.
