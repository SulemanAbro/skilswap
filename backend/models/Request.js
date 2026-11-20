import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const RequestSchemaDefinition = {
  senderId: { type: 'ObjectId', ref: 'User', required: true },
  receiverId: { type: 'ObjectId', ref: 'User', required: true },
  offeredSkill: { type: 'String', required: true },
  requestedSkill: { type: 'String', required: true },
  message: { type: 'String', default: '' },
  status: {
    type: 'String',
    enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'],
    default: 'Pending',
  },
  createdAt: { type: 'Date' },
};

export const RequestModel = {
  findAll() {
    return getStore().requests;
  },
  findById(id) {
    return getStore().requests.find((r) => r._id === id) || null;
  },
  findByUserId(userId) {
    return getStore().requests.filter(
      (r) => r.senderId === userId || r.receiverId === userId
    );
  },
  create(data) {
    const store = getStore();
    const doc = {
      _id: generateObjectId(),
      senderId: data.senderId,
      receiverId: data.receiverId,
      offeredSkill: data.offeredSkill,
      requestedSkill: data.requestedSkill,
      message: data.message || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    store.requests.push(doc);
    persistStore();
    return doc;
  },
  updateById(id, updates) {
    const store = getStore();
    const idx = store.requests.findIndex((r) => r._id === id);
    if (idx === -1) return null;
    store.requests[idx] = { ...store.requests[idx], ...updates };
    persistStore();
    return store.requests[idx];
  },
};
