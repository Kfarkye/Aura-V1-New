import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { get, set } from 'idb-keyval';

export interface Secret {
  id: string;
  key: string;
  value: string;
  isSet: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolRegistryItem {
  name: string;
  description: string;
  status: string;
  endpoint: string;
  deployment_mode: string;
  runtime: string;
  source_receipt_id?: string;
  updated_at?: string;
}

export interface LocalCorruptionQuarantineRecord {
  id: string;
  collectionName: string;
  failureReason: string;
  detectedAt: number;
  payloadPreview: string;
  isSecret?: boolean;
}

export interface LocalIntegrityReceipt {
  id: string;
  collectionName: string;
  action: 'fallback_to_default' | 'quarantined_and_fallback';
  reason: string;
  timestamp: number;
}

interface SyncContextType {
  secrets: Secret[];
  setSecrets: React.Dispatch<React.SetStateAction<Secret[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  registry: ToolRegistryItem[];
  setRegistry: React.Dispatch<React.SetStateAction<ToolRegistryItem[]>>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  runLocalIntegrityScan: () => Promise<any>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Helper to redact secrets
function redactPayload(payload: any, collectionName: string): { preview: string; isSecret: boolean } {
  const isSecretPayload = collectionName.toLowerCase().includes('secrets') || collectionName.toLowerCase().includes('vault') || (payload && payload.isSecret === true);

  if (isSecretPayload) {
    return {
      preview: '[REDACTED_SECRET_PAYLOAD]',
      isSecret: true,
    };
  }
  
  let payloadString = '';
  try {
     payloadString = JSON.stringify(payload);
  } catch (e) {
     payloadString = '[UNSERIALIZABLE]';
  }
  return {
    preview: payloadString.substring(0, 200) + (payloadString.length > 200 ? '...' : ''),
    isSecret: false,
  };
}

const defaultSecrets: Secret[] = [
  { id: '1', key: 'GEMINI_API_KEY', value: '', isSet: false },
  { id: '2', key: 'GOOGLE_CLOUD_PROJECT', value: '', isSet: false },
  { id: '3', key: 'KALSHI_API_KEY', value: '', isSet: false },
  { id: '4', key: 'OPENAI_API_KEY', value: '', isSet: false },
];

const defaultChat: ChatMessage[] = [
  { role: 'assistant', content: 'Hello! I am the AURA Engine Assistant with Search Grounding enabled. Need me to index the Stripe API docs or generate a Kalshi MCP? Just ask and I will locate the URLs and handle the rest.' }
];

export function SyncProvider({ children }: { children: ReactNode }) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [registry, setRegistry] = useState<ToolRegistryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Data Integrity Validators
  const isValidSecretArray = (data: any): data is Secret[] => {
    return Array.isArray(data) && data.every(item => 
      typeof item === 'object' && item !== null && 
      typeof item.id === 'string' && 
      typeof item.key === 'string' && 
      typeof item.value === 'string' && 
      typeof item.isSet === 'boolean'
    );
  };

  const isValidChatArray = (data: any): data is ChatMessage[] => {
    return Array.isArray(data) && data.every(item => 
      typeof item === 'object' && item !== null && 
      (item.role === 'user' || item.role === 'assistant') && 
      typeof item.content === 'string'
    );
  };

  const isValidRegistryArray = (data: any): data is ToolRegistryItem[] => {
    return Array.isArray(data) && data.every(item => 
      typeof item === 'object' && item !== null && 
      typeof item.name === 'string' && 
      typeof item.description === 'string' && 
      typeof item.status === 'string' &&
      typeof item.deployment_mode === 'string' &&
      typeof item.runtime === 'string'
    );
  };

  const runLocalIntegrityScan = useCallback(async () => {
    let validCount = 0;
    let corruptedCount = 0;
    let quarantinedCount = 0;
    let recoveredCount = 0;
    const scanDetails: Record<string, any> = {};

    try {
      const initialQuarantinedRecords: LocalCorruptionQuarantineRecord[] = await get('local_corruption_quarantine') || [];
      quarantinedCount = initialQuarantinedRecords.length;

      const collections = [
        { name: 'aura-secrets', guard: isValidSecretArray },
        { name: 'aura-chat', guard: isValidChatArray },
        { name: 'aura-registry', guard: isValidRegistryArray },
      ];

      for (const col of collections) {
        let collectionTotal = 0;
        let collectionValid = 0;
        let collectionCorrupted = 0;
        let collectionQuarantinedFromScan = 0;

        try {
          const rawPayload = await get(col.name);
          if (rawPayload !== undefined && rawPayload !== null) {
            collectionTotal = Array.isArray(rawPayload) ? rawPayload.length : 1;
            
            if (col.guard(rawPayload)) {
               collectionValid = collectionTotal;
               validCount += collectionValid;
            } else {
               collectionCorrupted = collectionTotal;
               corruptedCount += collectionCorrupted;
               
               const now = Date.now();
               const payloadInfo = redactPayload(rawPayload, col.name);
               const qRecord: LocalCorruptionQuarantineRecord = {
                  id: `scan-quar-${col.name}-${now}-${Math.random().toString(36).substring(2, 9)}`,
                  collectionName: col.name,
                  failureReason: 'Scan detected type guard failure',
                  detectedAt: now,
                  payloadPreview: payloadInfo.preview,
                  isSecret: payloadInfo.isSecret
               };
               
               const qRecords: LocalCorruptionQuarantineRecord[] = await get('local_corruption_quarantine') || [];
               await set('local_corruption_quarantine', [...qRecords, qRecord]);
               collectionQuarantinedFromScan++;
               quarantinedCount++;

               const rRecord: LocalIntegrityReceipt = {
                  id: `scan-rcpt-${col.name}-${now}-${Math.random().toString(36).substring(2, 9)}`,
                  collectionName: col.name,
                  action: 'quarantined_and_fallback',
                  reason: 'Integrity scan detected corruption, record quarantined.',
                  timestamp: now
               };

               const rRecords: LocalIntegrityReceipt[] = await get('local_integrity_receipts') || [];
               await set('local_integrity_receipts', [...rRecords, rRecord]);
            }
          }
        } catch (e) {
          console.error(`Scan error on ${col.name}`, e);
        }

        scanDetails[col.name] = {
           total: collectionTotal,
           valid: collectionValid,
           corrupted: collectionCorrupted,
           quarantinedFromScan: collectionQuarantinedFromScan
        };
      }
      
      const result = {
         valid: validCount,
         corrupted: corruptedCount,
         quarantined: quarantinedCount,
         recovered: recoveredCount,
         scanDetails
      };
      
      console.log('Local Integrity Scan Results:', result);
      return result;
    } catch (err) {
      console.error('Scan failed', err);
      return null;
    }
  }, []);

  // Local-First Sync Initialization (IndexedDB)
  useEffect(() => {
    async function loadAndHydrate<T>(
      collectionName: string,
      rawPayload: any,
      guard: (data: any) => data is T,
      defaultValue: T
    ): Promise<T> {
      if (rawPayload === undefined || rawPayload === null) {
        return defaultValue;
      }
      if (guard(rawPayload)) {
        if (Array.isArray(rawPayload) && rawPayload.length === 0 && collectionName !== 'aura-registry') {
           return defaultValue;
        }
        return rawPayload;
      }
      
      console.warn(`Type guard failed for ${collectionName}. Quarantining and using default.`);
      try {
        const now = Date.now();
        const payloadInfo = redactPayload(rawPayload, collectionName);
        const qRecord: LocalCorruptionQuarantineRecord = {
          id: `quarantine-${collectionName}-${now}-${Math.random().toString(36).substring(2, 9)}`,
          collectionName,
          failureReason: 'Hydration validation failed',
          detectedAt: now,
          payloadPreview: payloadInfo.preview,
          isSecret: payloadInfo.isSecret
        };
        const qRecords: LocalCorruptionQuarantineRecord[] = await get('local_corruption_quarantine') || [];
        await set('local_corruption_quarantine', [...qRecords, qRecord]);

        const rRecord: LocalIntegrityReceipt = {
          id: `receipt-${collectionName}-${now}-${Math.random().toString(36).substring(2, 9)}`,
          collectionName,
          action: 'quarantined_and_fallback',
          reason: 'Hydration type guard failed',
          timestamp: now
        };
        const rRecords: LocalIntegrityReceipt[] = await get('local_integrity_receipts') || [];
        await set('local_integrity_receipts', [...rRecords, rRecord]);
      } catch (e) {
        console.error('Failed to write quarantine/receipt records', e);
      }
      return defaultValue;
    }

    async function loadData() {
      try {
        const savedSecrets = await get('aura-secrets');
        const savedChat = await get('aura-chat');
        const savedRegistry = await get('aura-registry');

        const hydratedSecrets = await loadAndHydrate('aura-secrets', savedSecrets, isValidSecretArray, defaultSecrets);
        setSecrets(hydratedSecrets);

        const hydratedChat = await loadAndHydrate('aura-chat', savedChat, isValidChatArray, defaultChat);
        setChatMessages(hydratedChat);

        const hydratedRegistry = await loadAndHydrate('aura-registry', savedRegistry, isValidRegistryArray, []);
        setRegistry(hydratedRegistry);

      } catch (err) {
        console.error("Local sync hydration failed. Possible IndexedDB corruption.", err);
        // Fallback to defaults on catastrophic read failure
        setSecrets(defaultSecrets);
        setChatMessages(defaultChat);
        setRegistry([]);
      } finally {
        setIsSyncing(false);
      }
    }
    loadData();
  }, []); // Add dependencies to suppress warnings or leave empty to instantiate once

  // Sync to IndexedDB and abstract background headless sync
  useEffect(() => {
    if (isSyncing) return;

    const syncData = async () => {
      try {
        const results = await Promise.allSettled([
            set('aura-secrets', secrets),
            set('aura-chat', chatMessages),
            set('aura-registry', registry)
        ]);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
             const keys = ['aura-secrets', 'aura-chat', 'aura-registry'];
             console.error(`Failed to sync ${keys[index]} to IndexedDB:`, result.reason);
          }
        });

        setLastSyncTime(new Date());

        // Abstracted Headless Payload Sync (background only when optimal connectivity)
        if (navigator.onLine && (window as any).requestIdleCallback) {
            (window as any).requestIdleCallback(() => {
                // Background sync logic...
            });
        }
      } catch (err) {
         console.error("Background sync failed", err);
      }
    };

    // Debounce state changes before committing
    const debounceId = setTimeout(syncData, 500);
    return () => clearTimeout(debounceId);
  }, [secrets, chatMessages, registry, isSyncing]);

  return (
    <SyncContext.Provider value={{
      secrets, setSecrets,
      chatMessages, setChatMessages,
      registry, setRegistry,
      isSyncing, lastSyncTime,
      runLocalIntegrityScan
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
