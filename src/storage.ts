import { DepositRecord, Slot, AuditLogItem } from '../types';
import { db } from '../firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'chargesafe_v2';
const LEGACY_KEY = 'chargesafe_v1';

// Pre-generate 800 slots: 100 boxes × 8 sockets
export function generateAll800Slots(): Slot[] {
  const slots: Slot[] = [];
  for (let b = 1; b <= 100; b++) {
    const box = `B${String(b).padStart(3, '0')}`;
    for (let s = 1; s <= 8; s++) {
      const socket = `S${String(s).padStart(2, '0')}`;
      slots.push({
        box,
        socket,
        key: `${box}-${socket}`,
        boxNum: b,
        socketNum: s
      });
    }
  }
  return slots;
}

export const ALL_800_SLOTS = generateAll800Slots();

// Initial fallback seed
const SEED_DEPOSITS: DepositRecord[] = [
  {
    token: 1,
    tokenStr: '00001',
    mobile: '9876543210',
    box: 'B001',
    socket: 'S01',
    slotKey: 'B001-S01',
    status: 'CHARGING',
    time: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 42 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    phoneModel: 'Samsung S23 (Phantom Black)',
    cableType: 'Type-C',
    notes: 'Fast charge requested'
  },
  {
    token: 2,
    tokenStr: '00002',
    mobile: '9447123456',
    box: 'B001',
    socket: 'S02',
    slotKey: 'B001-S02',
    status: 'CHARGING',
    time: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 18 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    phoneModel: 'Apple iPhone 14 (Blue)',
    cableType: 'Lightning (iPhone)',
    notes: 'Customer at Food Court'
  },
  {
    token: 3,
    tokenStr: '00003',
    mobile: '9895098765',
    box: 'B002',
    socket: 'S05',
    slotKey: 'B002-S05',
    status: 'COLLECTED',
    time: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 95 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    collectedAt: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    collectedBy: 'staff001',
    phoneModel: 'OnePlus 11R',
    cableType: 'Type-C',
    notes: 'ID verified and collected'
  }
];

export function getLocalCache(): { deposits: DepositRecord[]; logs: AuditLogItem[] } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated: DepositRecord[] = parsed.map((item: { token: number; mobile: string; box: string; socket: string; status: string; time: string; photo?: string }) => ({
          token: item.token,
          tokenStr: String(item.token).padStart(5, '0'),
          mobile: item.mobile || '',
          box: item.box || 'B001',
          socket: item.socket || 'S01',
          slotKey: `${item.box || 'B001'}-${item.socket || 'S01'}`,
          status: item.status === 'COLLECTED' ? 'COLLECTED' : 'CHARGING',
          time: new Date().toISOString(),
          formattedTime: item.time || new Date().toLocaleTimeString(),
          photo: item.photo || '',
          phoneModel: 'Mobile Phone',
          cableType: 'Type-C'
        }));
        return { deposits: migrated, logs: [] };
      }
    }
  } catch (err) {
    console.error('Local cache read error:', err);
  }
  return { deposits: SEED_DEPOSITS, logs: [] };
}

export function saveLocalCache(deposits: DepositRecord[], logs: AuditLogItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ deposits, logs }));
  } catch (err) {
    console.error('Local cache write error:', err);
  }
}

export type SyncListener = (data: { deposits: DepositRecord[]; logs: AuditLogItem[]; isCloudLive: boolean }) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  public isCloudLive = true;
  private currentDeposits: DepositRecord[] = [];
  private currentLogs: AuditLogItem[] = [];
  private hasInitializedFirestore = false;

  constructor() {
    const initial = getLocalCache();
    this.currentDeposits = initial.deposits.length ? initial.deposits : SEED_DEPOSITS;
    this.currentLogs = initial.logs;
    this.fetchInitialData();
    this.fetchFirestoreDocs();
    this.initFirestoreSync();
    this.fallbackToSSE();
    if (typeof window !== 'undefined') {
      setInterval(() => this.fetchFirestoreDocs(), 8000);
    }
  }

  public async fetchFirestoreDocs() {
    try {
      const snap = await getDocs(collection(db, 'deposits'));
      if (!snap.empty) {
        const records: DepositRecord[] = [];
        snap.forEach((d) => records.push(d.data() as DepositRecord));
        records.sort((a, b) => b.token - a.token);
        this.currentDeposits = records;
        this.isCloudLive = true;
        saveLocalCache(this.currentDeposits, this.currentLogs);
        this.notify();
      }
    } catch {
      // fallback to SSE / local cache
    }
  }

  private async fetchInitialData() {
    try {
      const res = await fetch('/api/deposits');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deposits) && data.deposits.length > 0) {
          this.currentDeposits = data.deposits;
          if (Array.isArray(data.logs)) this.currentLogs = data.logs;
          this.isCloudLive = true;
          saveLocalCache(this.currentDeposits, this.currentLogs);
          this.notify();
        }
      }
    } catch {
      // offline fallback is already active
    }
  }

  private initFirestoreSync() {
    if (typeof window === 'undefined') return;

    try {
      const depositsCol = collection(db, 'deposits');
      const logsCol = collection(db, 'audit_logs');

      // Listen to Firestore real-time updates for deposits
      onSnapshot(
        depositsCol,
        async (snapshot) => {
          this.isCloudLive = true;
          if (snapshot.empty && !this.hasInitializedFirestore) {
            this.hasInitializedFirestore = true;
            // Seed initial records into Firestore if collection is empty
            const batch = writeBatch(db);
            const toSeed = this.currentDeposits.length ? this.currentDeposits : SEED_DEPOSITS;
            toSeed.forEach((rec) => {
              const docRef = doc(db, 'deposits', rec.tokenStr);
              batch.set(docRef, rec);
            });
            await batch.commit().catch(console.warn);
            this.notify();
            return;
          }

          if (!snapshot.empty) {
            const records: DepositRecord[] = [];
            snapshot.forEach((d) => {
              records.push(d.data() as DepositRecord);
            });
            records.sort((a, b) => b.token - a.token);
            this.currentDeposits = records;
            saveLocalCache(this.currentDeposits, this.currentLogs);
            this.notify();
          }
        },
        (error) => {
          console.warn('Firestore deposits listener warning:', error.message);
          this.fallbackToSSE();
        }
      );

      // Listen to Firestore real-time updates for audit logs
      onSnapshot(
        logsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const logsList: AuditLogItem[] = [];
            snapshot.forEach((d) => {
              logsList.push(d.data() as AuditLogItem);
            });
            logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.currentLogs = logsList;
            saveLocalCache(this.currentDeposits, this.currentLogs);
            this.notify();
          }
        },
        (error) => {
          console.warn('Firestore logs listener warning:', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore initialization failed, using fallback:', err);
      this.fallbackToSSE();
    }
  }

  private fallbackToSSE() {
    try {
      const eventSource = new EventSource('/api/live-stream');
      eventSource.onopen = () => {
        this.isCloudLive = true;
        this.notify();
      };
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'DATA_SYNC' && Array.isArray(payload.deposits) && payload.deposits.length > 0) {
            this.currentDeposits = payload.deposits;
            if (Array.isArray(payload.logs)) this.currentLogs = payload.logs;
            saveLocalCache(this.currentDeposits, this.currentLogs);
            this.isCloudLive = true;
            this.notify();
          }
        } catch {
          // ignore
        }
      };
      eventSource.onerror = () => {
        // keep offline cache intact
      };
    } catch {
      // ignore
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({
      deposits: this.currentDeposits,
      logs: this.currentLogs,
      isCloudLive: this.isCloudLive
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          deposits: this.currentDeposits,
          logs: this.currentLogs,
          isCloudLive: this.isCloudLive
        });
      } catch (e) {
        console.error(e);
      }
    });
  }

  public async createDeposit(params: {
    mobile: string;
    box: string;
    socket: string;
    photo?: string;
    phoneModel?: string;
    cableType?: string;
    notes?: string;
    fee?: number;
    createdBy?: string;
  }): Promise<{ success: boolean; record?: DepositRecord; error?: string }> {
    const currentTokens = this.currentDeposits.map((d) => d.token);
    let nextToken = currentTokens.length ? Math.max(...currentTokens) + 1 : 1;
    if (nextToken > 10000) {
      for (let i = 1; i <= 10000; i++) {
        if (!currentTokens.includes(i)) {
          nextToken = i;
          break;
        }
      }
    }

    const tokenStr = String(nextToken).padStart(5, '0');
    const now = new Date();
    const newRecord: DepositRecord = {
      token: nextToken,
      tokenStr,
      mobile: params.mobile,
      box: params.box,
      socket: params.socket,
      slotKey: `${params.box}-${params.socket}`,
      status: 'CHARGING',
      time: now.toISOString(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      photo: params.photo || '',
      phoneModel: params.phoneModel || 'Smartphone',
      cableType: (params.cableType as DepositRecord['cableType']) || 'Type-C',
      notes: params.notes || '',
      fee: params.fee || 0
    };

    const logItem: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: now.toISOString(),
      action: 'DEPOSIT',
      performedBy: params.createdBy || 'Staff',
      details: `Token ${tokenStr} deposited at ${params.box}-${params.socket}`,
      token: nextToken,
      slotKey: newRecord.slotKey
    };

    try {
      // Write to Firebase Firestore
      await setDoc(doc(db, 'deposits', tokenStr), newRecord);
      await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
    } catch (firebaseErr) {
      console.warn('Firestore write notice, saving via API / Local:', firebaseErr);
      try {
        await fetch('/api/deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
      } catch {
        // local
      }
    }

    this.currentDeposits.unshift(newRecord);
    this.currentLogs.unshift(logItem);
    saveLocalCache(this.currentDeposits, this.currentLogs);
    this.notify();
    return { success: true, record: newRecord };
  }

  public async collectDeposit(token: number, collectedBy = 'Staff', notes = ''): Promise<boolean> {
    const item = this.currentDeposits.find((d) => d.token === token);
    if (!item) return false;

    const collectedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedNotes = (item.notes ? item.notes + ' | ' : '') + (notes || 'Collected');

    const logItem: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'COLLECT',
      performedBy: collectedBy,
      details: `Token ${item.tokenStr} collected. Handed over from ${item.box}-${item.socket}`,
      token: item.token,
      slotKey: item.slotKey
    };

    try {
      // Update in Firebase Firestore
      await updateDoc(doc(db, 'deposits', item.tokenStr), {
        status: 'COLLECTED',
        collectedAt,
        collectedBy,
        notes: updatedNotes
      });
      await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
    } catch (firebaseErr) {
      console.warn('Firestore collect notice:', firebaseErr);
      try {
        await fetch(`/api/deposits/${token}/collect`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectedBy, notes })
        });
      } catch {
        // local
      }
    }

    item.status = 'COLLECTED';
    item.collectedAt = collectedAt;
    item.collectedBy = collectedBy;
    item.notes = updatedNotes;
    this.currentLogs.unshift(logItem);
    saveLocalCache(this.currentDeposits, this.currentLogs);
    this.notify();
    return true;
  }

  public async vacateSlot(token: number, vacatedBy = 'Admin', reason = ''): Promise<boolean> {
    const item = this.currentDeposits.find((d) => d.token === token);
    if (!item) return false;

    const collectedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const notes = (item.notes ? item.notes + ' | ' : '') + `Vacated: ${reason || 'Admin override'}`;

    const logItem: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'VACATE_SLOT',
      performedBy: vacatedBy,
      details: `Slot ${item.box}-${item.socket} force-vacated for token ${item.tokenStr}`,
      token: item.token,
      slotKey: item.slotKey
    };

    try {
      await updateDoc(doc(db, 'deposits', item.tokenStr), {
        status: 'COLLECTED',
        collectedAt,
        collectedBy: vacatedBy,
        notes
      });
      await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
    } catch (e) {
      console.warn('Firestore vacate notice:', e);
      try {
        await fetch(`/api/deposits/${token}/vacate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacatedBy, reason })
        });
      } catch {
        // local
      }
    }

    item.status = 'COLLECTED';
    item.collectedAt = collectedAt;
    item.collectedBy = vacatedBy;
    item.notes = notes;
    this.currentLogs.unshift(logItem);
    saveLocalCache(this.currentDeposits, this.currentLogs);
    this.notify();
    return true;
  }

  public exportBackup() {
    const backupData = {
      exportTime: new Date().toISOString(),
      system: 'ChargeSafe Phone Charging Station',
      totalSlots: 800,
      deposits: this.currentDeposits,
      logs: this.currentLogs
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chargesafe_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public async importBackup(jsonString: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const deposits = Array.isArray(parsed.deposits) ? parsed.deposits : (Array.isArray(parsed) ? parsed : null);
      if (!deposits) {
        return { success: false, error: 'Invalid backup structure. Missing deposits list.' };
      }

      const logs = Array.isArray(parsed.logs) ? parsed.logs : [];

      try {
        const batch = writeBatch(db);
        deposits.forEach((d: DepositRecord) => {
          batch.set(doc(db, 'deposits', d.tokenStr), d);
        });
        await batch.commit();
      } catch (e) {
        console.warn('Firestore import notice:', e);
      }

      this.currentDeposits = deposits;
      this.currentLogs = logs;
      saveLocalCache(deposits, logs);
      this.notify();
      return { success: true, count: deposits.length };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalid JSON file' };
    }
  }

  public async resetDemo() {
    try {
      const snapshot = await getDocs(collection(db, 'deposits'));
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      SEED_DEPOSITS.forEach((rec) => {
        batch.set(doc(db, 'deposits', rec.tokenStr), rec);
      });
      await batch.commit();
    } catch {
      // offline fallback
    }

    this.currentDeposits = SEED_DEPOSITS;
    this.currentLogs = [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_RESET',
        performedBy: 'Admin',
        details: 'System restored to initial demo state'
      }
    ];
    saveLocalCache(this.currentDeposits, this.currentLogs);
    this.notify();
  }
}

export const syncManager = new SyncManager();
