import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const ReportModel = {
  findAll() {
    return getStore().reports || [];
  },
  findById(id) {
    return (getStore().reports || []).find((r) => r._id === id) || null;
  },
  create(data) {
    const store = getStore();
    if (!store.reports) store.reports = [];
    const doc = {
      _id: generateObjectId(),
      reporterId: data.reporterId,
      reportedUserId: data.reportedUserId,
      reason: data.reason,
      details: data.details || '',
      status: 'Open',
      createdAt: new Date().toISOString(),
    };
    store.reports.push(doc);
    persistStore();
    return doc;
  },
  updateById(id, updates) {
    const store = getStore();
    if (!store.reports) return null;
    const idx = store.reports.findIndex((r) => r._id === id);
    if (idx === -1) return null;
    store.reports[idx] = { ...store.reports[idx], ...updates };
    persistStore();
    return store.reports[idx];
  },
};
