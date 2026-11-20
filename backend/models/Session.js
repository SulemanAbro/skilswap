import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const SessionSchemaDefinition = {
  requestId: { type: 'ObjectId', ref: 'Request', required: true },
  teacherId: { type: 'ObjectId', ref: 'User', required: true },
  learnerId: { type: 'ObjectId', ref: 'User', required: true },
  skillName: { type: 'String', required: true },
  exchangeSkill: { type: 'String', default: '' },
  sessionDate: { type: 'String', required: true },
  sessionTime: { type: 'String', required: true },
  meetingType: { type: 'String', enum: ['Online', 'In-person'], required: true },
  description: { type: 'String', default: '' },
  status: { type: 'String', enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  createdAt: { type: 'Date' },
};

export const SessionModel = {
  findAll() {
    return getStore().sessions;
  },
  findById(id) {
    return getStore().sessions.find((s) => s._id === id) || null;
  },
  findByUserId(userId) {
    return getStore().sessions.filter(
      (s) => s.teacherId === userId || s.learnerId === userId
    );
  },
  create(data) {
    const store = getStore();
    const doc = {
      _id: generateObjectId(),
      requestId: data.requestId,
      teacherId: data.teacherId,
      learnerId: data.learnerId,
      skillName: data.skillName,
      exchangeSkill: data.exchangeSkill || '',
      sessionDate: data.sessionDate,
      sessionTime: data.sessionTime,
      meetingType: data.meetingType,
      description: data.description || '',
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };
    store.sessions.push(doc);
    persistStore();
    return doc;
  },
  updateById(id, updates) {
    const store = getStore();
    const idx = store.sessions.findIndex((s) => s._id === id);
    if (idx === -1) return null;
    store.sessions[idx] = { ...store.sessions[idx], ...updates };
    persistStore();
    return store.sessions[idx];
  },
};
