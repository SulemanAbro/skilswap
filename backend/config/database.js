import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SAMPLE_DATA_PATH = path.join(ROOT_DIR, 'database', 'sample-data.json');
const LIVE_DATA_PATH = path.join(ROOT_DIR, 'database', 'live-data.json');

let memoryStore = null;

function prepareSeedData(raw) {
  const users = (raw.users || []).map((u) => {
    const copy = { ...u };
    if (copy.seedPassword && !copy.passwordHash) {
      copy.passwordHash = hashPassword(copy.seedPassword);
    }
    delete copy.seedPassword;
    return copy;
  });

  return {
    users,
    skills: raw.skills || [],
    requests: raw.requests || [],
    sessions: raw.sessions || [],
    reviews: raw.reviews || [],
    reports: raw.reports || [],
  };
}

export async function connectDatabase() {
  // Support MongoDB URI configuration for local MongoDB / Atlas setups
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.connect(mongoUri);
      console.log('Connected to MongoDB instance.');
    } catch (err) {
      console.warn(
        'MONGO_URI configured but MongoDB connection failed; falling back to local document store:',
        err.message
      );
    }
  }

  if (!fs.existsSync(LIVE_DATA_PATH)) {
    const raw = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf8'));
    memoryStore = prepareSeedData(raw);
    fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
  } else {
    memoryStore = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, 'utf8'));
  }

  return memoryStore;
}

export function getStore() {
  if (!memoryStore) {
    if (fs.existsSync(LIVE_DATA_PATH)) {
      memoryStore = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, 'utf8'));
    } else {
      const raw = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf8'));
      memoryStore = prepareSeedData(raw);
      fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
    }
  }
  return memoryStore;
}

export function persistStore() {
  if (!memoryStore) return;
  fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
}
