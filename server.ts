import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Support base64 photos in requests (up to 20MB)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'chargesafe-db.json');

interface DepositRecord {
  token: number;
  tokenStr: string;
  mobile: string;
  box: string;
  socket: string;
  slotKey: string;
  status: 'CHARGING' | 'COLLECTED';
  time: string;
  formattedTime: string;
  collectedAt?: string;
  collectedBy?: string;
  photo?: string;
  phoneModel?: string;
  cableType?: string;
  notes?: string;
  fee?: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  token?: number;
  slotKey?: string;
}

interface DBData {
  deposits: DepositRecord[];
  logs: AuditLog[];
  stationName: string;
  lastUpdated: string;
}

// Initial sample deposits for immediate live demo
const INITIAL_DEPOSITS: DepositRecord[] = [
  {
    token: 1,
    tokenStr: '00001',
    mobile: '9876543210',
    box: 'B001',
    socket: 'S01',
    slotKey: 'B001-S01',
    status: 'CHARGING',
    time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 45 * 60 * 1000).toLocaleString(),
    phoneModel: 'Samsung Galaxy S23 (Black)',
    cableType: 'Type-C',
    notes: 'Fast charging requested'
  },
  {
    token: 2,
    tokenStr: '00002',
    mobile: '9447123456',
    box: 'B001',
    socket: 'S02',
    slotKey: 'B001-S02',
    status: 'CHARGING',
    time: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 25 * 60 * 1000).toLocaleString(),
    phoneModel: 'iPhone 14 (Blue)',
    cableType: 'Lightning (iPhone)',
    notes: 'Token given to customer'
  },
  {
    token: 3,
    tokenStr: '00003',
    mobile: '9895098765',
    box: 'B002',
    socket: 'S05',
    slotKey: 'B002-S05',
    status: 'COLLECTED',
    time: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    formattedTime: new Date(Date.now() - 120 * 60 * 1000).toLocaleString(),
    collectedAt: new Date(Date.now() - 10 * 60 * 1000).toLocaleString(),
    collectedBy: 'staff001',
    phoneModel: 'Redmi Note 12',
    cableType: 'Type-C',
    notes: 'Returned with ID verification'
  }
];

function getDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DBData = {
        deposits: INITIAL_DEPOSITS,
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            action: 'SYSTEM_START',
            performedBy: 'System',
            details: 'ChargeSafe Station Database initialized with 800 slots.'
          }
        ],
        stationName: 'ChargeSafe Central Hub',
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB:', err);
    return {
      deposits: INITIAL_DEPOSITS,
      logs: [],
      stationName: 'ChargeSafe Central Hub',
      lastUpdated: new Date().toISOString()
    };
  }
}

function saveDB(data: DBData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    broadcastUpdate(data);
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Server-Sent Events (SSE) clients for real-time live synchronization to mobile & admin
const sseClients: Response[] = [];

function broadcastUpdate(data: DBData) {
  const payload = JSON.stringify({
    type: 'DATA_SYNC',
    deposits: data.deposits,
    logs: data.logs,
    timestamp: data.lastUpdated
  });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

// API Routes
app.get('/api/live-stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('\n');
  sseClients.push(res);

  // Send current state immediately
  const db = getDB();
  const payload = JSON.stringify({
    type: 'DATA_SYNC',
    deposits: db.deposits,
    logs: db.logs,
    timestamp: db.lastUpdated
  });
  res.write(`data: ${payload}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

app.get('/api/status', (_req: Request, res: Response) => {
  const db = getDB();
  const occupied = db.deposits.filter(d => d.status === 'CHARGING').length;
  const collected = db.deposits.filter(d => d.status === 'COLLECTED').length;
  res.json({
    online: true,
    serverTime: new Date().toISOString(),
    totalSlots: 800,
    occupied,
    available: 800 - occupied,
    collected,
    totalRecords: db.deposits.length,
    activeLiveSubscribers: sseClients.length
  });
});

app.get('/api/deposits', (_req: Request, res: Response) => {
  const db = getDB();
  res.json({ deposits: db.deposits, logs: db.logs });
});

app.post('/api/deposits', (req: Request, res: Response) => {
  const db = getDB();
  const { mobile, box, socket, photo, phoneModel, cableType, notes, fee, createdBy } = req.body;

  if (!mobile || !box || !socket) {
    res.status(400).json({ error: 'Mobile, Box and Socket are required.' });
    return;
  }

  // Check if slot is already occupied
  const isOccupied = db.deposits.some(
    d => d.box === box && d.socket === socket && d.status === 'CHARGING'
  );
  if (isOccupied) {
    res.status(409).json({ error: `Slot ${box}-${socket} is currently occupied.` });
    return;
  }

  // Find next token (1 to 10000)
  const currentTokens = db.deposits.map(d => d.token);
  let nextToken = 1;
  if (currentTokens.length > 0) {
    nextToken = Math.max(...currentTokens) + 1;
    if (nextToken > 10000) {
      // Find smallest unused token between 1 and 10000
      for (let i = 1; i <= 10000; i++) {
        if (!currentTokens.includes(i)) {
          nextToken = i;
          break;
        }
      }
    }
  }

  const tokenStr = String(nextToken).padStart(5, '0');
  const now = new Date();

  const newRecord: DepositRecord = {
    token: nextToken,
    tokenStr,
    mobile: String(mobile).trim(),
    box: String(box).trim(),
    socket: String(socket).trim(),
    slotKey: `${box}-${socket}`,
    status: 'CHARGING',
    time: now.toISOString(),
    formattedTime: now.toLocaleString(),
    photo: photo || '',
    phoneModel: phoneModel || 'Phone',
    cableType: cableType || 'Type-C',
    notes: notes || '',
    fee: fee ? Number(fee) : 0
  };

  db.deposits.unshift(newRecord);

  // Add audit log
  db.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString(),
    action: 'DEPOSIT',
    performedBy: createdBy || 'staff001',
    details: `Deposited token ${tokenStr} at slot ${box}-${socket} for mobile ****${String(mobile).slice(-4)}`,
    token: nextToken,
    slotKey: `${box}-${socket}`
  });

  saveDB(db);
  res.status(201).json({ success: true, record: newRecord });
});

app.put('/api/deposits/:token/collect', (req: Request, res: Response) => {
  const db = getDB();
  const token = parseInt(req.params.token, 10);
  const { collectedBy, notes } = req.body;

  const deposit = db.deposits.find(d => d.token === token);
  if (!deposit) {
    res.status(404).json({ error: 'Deposit record not found.' });
    return;
  }

  deposit.status = 'COLLECTED';
  deposit.collectedAt = new Date().toLocaleString();
  deposit.collectedBy = collectedBy || 'Staff';
  if (notes) deposit.notes = (deposit.notes ? deposit.notes + ' | ' : '') + notes;

  db.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    action: 'COLLECT',
    performedBy: collectedBy || 'Staff',
    details: `Token ${deposit.tokenStr} verified & returned to customer. Slot ${deposit.box}-${deposit.socket} vacated.`,
    token: deposit.token,
    slotKey: deposit.slotKey
  });

  saveDB(db);
  res.json({ success: true, record: deposit });
});

app.put('/api/deposits/:token/vacate', (req: Request, res: Response) => {
  const db = getDB();
  const token = parseInt(req.params.token, 10);
  const { vacatedBy, reason } = req.body;

  const deposit = db.deposits.find(d => d.token === token);
  if (!deposit) {
    res.status(404).json({ error: 'Deposit record not found.' });
    return;
  }

  deposit.status = 'COLLECTED';
  deposit.collectedAt = new Date().toLocaleString();
  deposit.collectedBy = vacatedBy || 'Admin';
  deposit.notes = (deposit.notes ? deposit.notes + ' | ' : '') + `Emergency slot vacate: ${reason || 'Admin action'}`;

  db.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    action: 'VACATE_SLOT',
    performedBy: vacatedBy || 'Admin',
    details: `Slot ${deposit.box}-${deposit.socket} forced vacated for token ${deposit.tokenStr}. Reason: ${reason || 'Admin override'}`,
    token: deposit.token,
    slotKey: deposit.slotKey
  });

  saveDB(db);
  res.json({ success: true, record: deposit });
});

app.post('/api/backup/import', (req: Request, res: Response) => {
  const { deposits, logs } = req.body;
  if (!Array.isArray(deposits)) {
    res.status(400).json({ error: 'Invalid backup format. Deposits array expected.' });
    return;
  }
  const db: DBData = {
    deposits,
    logs: Array.isArray(logs) ? logs : [],
    stationName: 'ChargeSafe Central Hub',
    lastUpdated: new Date().toISOString()
  };
  saveDB(db);
  res.json({ success: true, count: deposits.length });
});

app.post('/api/reset', (_req: Request, res: Response) => {
  const db: DBData = {
    deposits: INITIAL_DEPOSITS,
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_RESET',
        performedBy: 'Admin',
        details: 'System restored to demo state.'
      }
    ],
    stationName: 'ChargeSafe Central Hub',
    lastUpdated: new Date().toISOString()
  };
  saveDB(db);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔌 ChargeSafe Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
