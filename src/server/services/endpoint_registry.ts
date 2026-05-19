import { getFirebaseDb } from '../../lib/firebase.ts';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export interface EndpointEntry {
  id: string;
  url: string;
  status: 'deploying' | 'active' | 'failed';
  revision: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deployment_mode?: string;
}

export interface DeployReceipt {
  id?: string;
  serviceId: string;
  revision: string;
  governedManifest: Record<string, any>;
  auditTrail: Array<Record<string, any>>;
  url?: string;
  status: 'active' | 'failed';
  timestamp: string;
  deployment_mode?: string;
}

// In-memory fallbacks for operational resilience during local dev or unauthenticated runs
const memoryEndpoints = new Map<string, any>();
const memoryReceipts = new Map<string, any[]>();

export function assertEndpointMatchesDeploymentMode(deploymentMode?: string, endpointUrl?: string): void {
  if (!deploymentMode) return;
  if (!endpointUrl) return;

  let host = endpointUrl;
  try {
    if (endpointUrl.startsWith('http://') || endpointUrl.startsWith('https://')) {
      const urlObj = new URL(endpointUrl);
      host = urlObj.hostname;
    }
  } catch (e) {
    // ignore
  }

  if (deploymentMode === 'simulated_preview') {
    if (!host.endsWith('.aura.tools')) {
      throw new Error(`Trust Invariant Violation: simulated_preview mode expects .aura.tools endpoint, got '${endpointUrl}'`);
    }
  } else if (deploymentMode === 'real_cloud_run') {
    if (!host.endsWith('.run.app')) {
      throw new Error(`Trust Invariant Violation: real_cloud_run mode expects .run.app endpoint, got '${endpointUrl}'`);
    }
  } else if (deploymentMode === 'vercel_preview') {
    if (!host.endsWith('.vercel.app')) {
      throw new Error(`Trust Invariant Violation: vercel_preview mode expects .vercel.app endpoint, got '${endpointUrl}'`);
    }
  }
}

export class EndpointRegistryService {
  /**
   * Registers or updates a service endpoint in the registry.
   */
  static async registerEndpoint(
    serviceId: string,
    url: string,
    revision: string,
    owner: string,
    deploymentMode?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    let resolvedMode = deploymentMode;
    if (!resolvedMode) {
      try {
        const existing = await this.getEndpoint(serviceId);
        if (existing && existing.deployment_mode) {
          resolvedMode = existing.deployment_mode;
        }
      } catch (err) {
        // ignore
      }
    }

    if (url && resolvedMode) {
      assertEndpointMatchesDeploymentMode(resolvedMode, url);
    }

    try {
      const db = await getFirebaseDb();
      const endpointDoc = doc(db, 'endpoint_registry', serviceId);
      
      const snap = await getDoc(endpointDoc);
      
      const data: Partial<EndpointEntry> = {
        id: serviceId,
        url,
        revision,
        owner_id: owner,
        updated_at: now,
      };

      if (resolvedMode) {
        data.deployment_mode = resolvedMode;
      }

      if (!snap.exists()) {
        data.status = 'deploying';
        data.created_at = now;
        await setDoc(endpointDoc, data);
      } else {
        await setDoc(endpointDoc, data, { merge: true });
      }
    } catch (err: any) {
      console.warn(`[EndpointRegistryService] Falling back to in-memory endpoint registration due to: ${err.message || err}`);
      const existing = memoryEndpoints.get(serviceId) || {};
      const data = {
        id: serviceId,
        url,
        revision,
        owner_id: owner,
        updated_at: now,
        status: existing.status || 'deploying',
        created_at: existing.created_at || now,
        deployment_mode: resolvedMode || existing.deployment_mode,
      };
      memoryEndpoints.set(serviceId, data);
    }
  }

  /**
   * Updates the status of an endpoint ('deploying' | 'active' | 'failed').
   */
  static async updateEndpointStatus(
    serviceId: string,
    status: 'deploying' | 'active' | 'failed'
  ): Promise<void> {
    const now = new Date().toISOString();
    try {
      const db = await getFirebaseDb();
      const endpointDoc = doc(db, 'endpoint_registry', serviceId);
      await setDoc(endpointDoc, {
        status,
        updated_at: now,
      }, { merge: true });
    } catch (err: any) {
      console.warn(`[EndpointRegistryService] Falling back to in-memory status update due to: ${err.message || err}`);
      const existing = memoryEndpoints.get(serviceId) || {};
      memoryEndpoints.set(serviceId, {
        ...existing,
        status,
        updated_at: now,
      });
    }
  }

  /**
   * Retrieves an endpoint by service ID.
   */
  static async getEndpoint(serviceId: string): Promise<EndpointEntry | null> {
    try {
      const db = await getFirebaseDb();
      const endpointDoc = doc(db, 'endpoint_registry', serviceId);
      const snap = await getDoc(endpointDoc);
      if (snap.exists()) {
        return snap.data() as EndpointEntry;
      }
    } catch (err: any) {
      console.warn(`[EndpointRegistryService] Reading endpoint from in-memory fallback due to: ${err.message || err}`);
    }
    return memoryEndpoints.get(serviceId) || null;
  }

  /**
   * Saves an immutable deployment receipt to Firestore.
   */
  static async saveDeployReceipt(receipt: DeployReceipt): Promise<void> {
    if (receipt.url && receipt.deployment_mode) {
      assertEndpointMatchesDeploymentMode(receipt.deployment_mode, receipt.url);
    }

    const receiptData = {
      ...receipt,
      timestamp: receipt.timestamp || new Date().toISOString(),
    };
    try {
      const db = await getFirebaseDb();
      const receiptsCol = collection(db, 'deploy_receipts');
      await addDoc(receiptsCol, receiptData);
    } catch (err: any) {
      console.warn(`[EndpointRegistryService] Falling back to in-memory receipt storage due to: ${err.message || err}`);
      const list = memoryReceipts.get(receipt.serviceId) || [];
      list.push(receiptData);
      memoryReceipts.set(receipt.serviceId, list);
    }
  }

  /**
   * Retrieves all deploy receipts for a given service ID.
   */
  static async getDeployReceipts(serviceId: string): Promise<DeployReceipt[]> {
    let list: DeployReceipt[] = [];
    try {
      const db = await getFirebaseDb();
      const receiptsCol = collection(db, 'deploy_receipts');
      const q = query(receiptsCol, where('serviceId', '==', serviceId));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as DeployReceipt);
      });
    } catch (err: any) {
      console.warn(`[EndpointRegistryService] Reading receipts from in-memory fallback due to: ${err.message || err}`);
      list = memoryReceipts.get(serviceId) || [];
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
