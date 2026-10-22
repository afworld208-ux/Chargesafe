import { DepositRecord, AuditLogItem } from "../types";

const STORAGE_KEY_DEPOSITS = "chargesafe_deposits_v1";
const STORAGE_KEY_LOGS = "chargesafe_logs_v1";

export const syncManager = {
  subscribe(callback: (data: { deposits: DepositRecord[]; logs: AuditLogItem[] }) => void) {
    const loadData = () => {
      try {
        const rawDeposits = localStorage.getItem(STORAGE_KEY_DEPOSITS);
        const rawLogs = localStorage.getItem(STORAGE_KEY_LOGS);
        const deposits: DepositRecord[] = rawDeposits ? JSON.parse(rawDeposits) : [];
        const logs: AuditLogItem[] = rawLogs ? JSON.parse(rawLogs) : [];
        callback({ deposits, logs });
      } catch (e) {
        console.error("Failed to load local storage", e);
      }
    };

    loadData();

    // Listen to storage events for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DEPOSITS || e.key === STORAGE_KEY_LOGS) {
        loadData();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  },

  async saveDeposit(deposit: DepositRecord, operatorId: string) {
    try {
      const rawDeposits = localStorage.getItem(STORAGE_KEY_DEPOSITS);
      const deposits: DepositRecord[] = rawDeposits ? JSON.parse(rawDeposits) : [];
      
      const existingIndex = deposits.findIndex(d => d.slotKey === deposit.slotKey && d.status === "CHARGING");
      if (existingIndex >= 0) {
        deposits[existingIndex] = deposit;
      } else {
        deposits.unshift(deposit);
      }
      
      localStorage.setItem(STORAGE_KEY_DEPOSITS, JSON.stringify(deposits));
      this.addLog("DEPOSIT", `Token #${deposit.token} assigned to slot ${deposit.slotKey}`, operatorId, deposit.token, deposit.slotKey);
    } catch (e) {
      console.error("Failed to save deposit", e);
    }
  },

  async returnDeposit(slotKey: string, operatorId: string) {
    try {
      const rawDeposits = localStorage.getItem(STORAGE_KEY_DEPOSITS);
      const deposits: DepositRecord[] = rawDeposits ? JSON.parse(rawDeposits) : [];
      
      const deposit = deposits.find(d => d.slotKey === slotKey && d.status === "CHARGING");
      if (deposit) {
        deposit.status = "COLLECTED";
        deposit.collectedAt = new Date().toISOString();
        deposit.collectedBy = operatorId;
        
        localStorage.setItem(STORAGE_KEY_DEPOSITS, JSON.stringify(deposits));
        this.addLog("RETURN", `Token #${deposit.token} collected from slot ${slotKey}`, operatorId, deposit.token, slotKey);
      }
    } catch (e) {
      console.error("Failed to return deposit", e);
    }
  },

  addLog(action: string, details: string, performedBy: string, token?: number, slotKey?: string) {
    try {
      const rawLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      const logs: AuditLogItem[] = rawLogs ? JSON.parse(rawLogs) : [];
      
      const newLog: AuditLogItem = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        action,
        performedBy,
        details,
        token,
        slotKey
      };

      logs.unshift(newLog);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(0, 200))); // Keep last 200 logs
    } catch (e) {
      console.error("Failed to add log", e);
    }
  }
};

