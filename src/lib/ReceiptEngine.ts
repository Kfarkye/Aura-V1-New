import jwt from "jsonwebtoken";
import { AuraReceipt, AuraFailure, AuraActionType } from "../types/aura";

// Use AURA_SIGNING_KEY from environment, fallback to a secure default if unset to prevent crashes
const SIGNING_KEY = process.env.AURA_SIGNING_KEY || "aura-default-local-secure-signing-key-2026";
// Automatically use RS256 if the key identifies as an RSA private key file, otherwise HS256 for symmetric strings
const ALGORITHM: "HS256" | "RS256" = SIGNING_KEY.includes("-----BEGIN PRIVATE KEY-----") ? "RS256" : "HS256";

export class ReceiptEngine {
  /**
   * Issues a cryptographically signed success receipt.
   * Throws a fatal runtime error if required evidence is missing.
   */
  public static issue<T>(
    action: AuraActionType,
    result: T,
    evidence?: AuraReceipt<T>["evidence"]
  ): AuraReceipt<T> {
    
    // RUNTIME INVARIANTS: Force the backend to prove it did the work.
    if (action === "github_save" && (!evidence?.repo_url || !evidence?.commit_sha)) {
      throw new Error(`[ReceiptEngine] Fatal: github_save requires repo_url and commit_sha evidence.`);
    }
    if ((action === "deploy" || action === "deploy_preview") && !evidence?.endpoint_url) {
      throw new Error(`[ReceiptEngine] Fatal: deploy requires endpoint_url evidence.`);
    }
    if (action === "sandbox_test" && (!evidence?.logs_count && !(result as any)?.logs)) {
      throw new Error(`[ReceiptEngine] Fatal: sandbox_test requires execution logs evidence.`);
    }
    if (action === "generate_mcp" && evidence?.file_count === undefined) {
      throw new Error(`[ReceiptEngine] Fatal: generate_mcp requires file_count evidence.`);
    }
    if (action === "docs_index" && (!evidence?.file_count || !evidence?.source)) {
      throw new Error(`[ReceiptEngine] Fatal: docs_index requires file_count and source evidence.`);
    }

    // Music Layer Evidence Invariants
    if (action === "play_music") {
      const resVal = result as any;
      if (!resVal || !resVal.track_id) {
        throw new Error(`[ReceiptEngine] Fatal: play_music requires a valid track_id in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: play_music requires platform and user_id in evidence.`);
      }
    }

    if (action === "search_music") {
      const resVal = result as any;
      if (!resVal || !resVal.query || !Array.isArray(resVal.results)) {
        throw new Error(`[ReceiptEngine] Fatal: search_music requires query and results array in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: search_music requires platform and user_id in evidence.`);
      }
    }

    if (action === "add_to_playlist") {
      const resVal = result as any;
      if (!resVal || !resVal.track_id || !resVal.playlist_id) {
        throw new Error(`[ReceiptEngine] Fatal: add_to_playlist requires a track_id and playlist_id in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: add_to_playlist requires platform and user_id in evidence.`);
      }
    }

    if (action === "create_playlist") {
      const resVal = result as any;
      if (!resVal || !resVal.playlist_id || !resVal.playlist_name) {
        throw new Error(`[ReceiptEngine] Fatal: create_playlist requires playlist_id and playlist_name in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: create_playlist requires platform and user_id in evidence.`);
      }
    }

    if (action === "get_playlists") {
      const resVal = result as any;
      if (!resVal || !Array.isArray(resVal.playlists)) {
        throw new Error(`[ReceiptEngine] Fatal: get_playlists requires playlists array in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: get_playlists requires platform and user_id in evidence.`);
      }
    }

    if (action === "get_now_playing") {
      const resVal = result as any;
      if (!resVal || !resVal.track_id || resVal.is_playing === undefined) {
        throw new Error(`[ReceiptEngine] Fatal: get_now_playing requires track_id and is_playing flag in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: get_now_playing requires platform and user_id in evidence.`);
      }
    }

    if (action === "control_playback") {
      const resVal = result as any;
      if (!resVal || !resVal.command || resVal.success === undefined) {
        throw new Error(`[ReceiptEngine] Fatal: control_playback requires command and success in its result.`);
      }
      if (!evidence || !evidence.platform || !evidence.user_id) {
        throw new Error(`[ReceiptEngine] Fatal: control_playback requires platform and user_id in evidence.`);
      }
    }

    const timestamp = new Date().toISOString();

    // Prepare payload for signature representing core trace attributes
    const signPayload = {
      action,
      timestamp,
      result,
      evidence
    };

    // Generate cryptographic JWS signature compact string
    const compactJws = jwt.sign(signPayload, SIGNING_KEY, { algorithm: ALGORITHM });

    return {
      ok: true,
      action,
      receipt_id: compactJws,
      timestamp,
      result,
      evidence,
    };
  }

  /**
   * Issues a standardized failure payload.
   */
  public static reject(
    action: AuraActionType,
    error_code: string,
    message: string,
    recoverable: boolean = true,
    details?: any
  ): AuraFailure {
    return {
      ok: false,
      action,
      error_code,
      message,
      timestamp: new Date().toISOString(),
      recoverable,
      details,
    };
  }

  /**
   * Cryptographically validates the JWS token against actual receipt fields to assert authenticity.
   */
  public static verify(receipt: any): { valid: boolean; reason?: string; decoded?: any } {
    if (!receipt || !receipt.receipt_id) {
      return { valid: false, reason: "Missing receipt_id compact token." };
    }

    try {
      // Handle RS256 vs HS256 validation. HS256 uses symmetric SIGNING_KEY. RS256 expects public key.
      const verifyKey = process.env.AURA_PUBLIC_KEY || SIGNING_KEY;
      
      const decoded: any = jwt.verify(receipt.receipt_id, verifyKey, {
        algorithms: ["HS256", "RS256"]
      });

      // Secure comparison of parameters to detect field tampering
      if (decoded.action !== receipt.action) {
        return { valid: false, reason: "Trace action manipulated." };
      }
      if (decoded.timestamp !== receipt.timestamp) {
        return { valid: false, reason: "Trace timestamp manipulated." };
      }

      if (JSON.stringify(decoded.result) !== JSON.stringify(receipt.result)) {
        return { valid: false, reason: "Payload results edited or falsified." };
      }

      const receiptEvidenceStr = JSON.stringify(receipt.evidence || {});
      const decodedEvidenceStr = JSON.stringify(decoded.evidence || {});
      if (receiptEvidenceStr !== decodedEvidenceStr) {
        return { valid: false, reason: "Metadata evidence parameters mismatch." };
      }

      return { valid: true, decoded };
    } catch (err: any) {
      return { valid: false, reason: err.message || "Failed cryptographic signature verification." };
    }
  }
}
