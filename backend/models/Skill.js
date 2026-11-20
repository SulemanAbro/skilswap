import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const SkillSchemaDefinition = {
  userId: { type: 'ObjectId', ref: 'User', required: true },
  skillName: { type: 'String', required: true },
  skillType: { type: 'String', enum: ['Teach', 'Learn'], required: true },
  skillLevel: { type: 'String', enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  description: { type: 'String', default: '' },
  createdAt: { type: 'Date' },
};

export const SkillModel = {
  findAll() {
    return getStore().skills;
  },
  findById(id) {
    return getStore().skills.find((s) => s._id === id) || null;
  },
  findByUserId(userId) {
    return getStore().skills.filter((s) => s.userId === userId);
  },
  create(data) {
    const store = getStore();
    const doc = {
      _id: generateObjectId(),
      userId: data.userId,
      skillName: data.skillName,
      skillType: data.skillType,
      skillLevel: data.skillLevel,
      description: data.description || '',
      createdAt: new Date().toISOString(),
    };
    store.skills.push(doc);
    persistStore();
    return doc;
  },
  updateById(id, updates) {
    const store = getStore();
    const idx = store.skills.findIndex((s) => s._id === id);
    if (idx === -1) return null;
    store.skills[idx] = { ...store.skills[idx], ...updates };
    persistStore();
    return store.skills[idx];
  },
  deleteById(id) {
    const store = getStore();
    const idx = store.skills.findIndex((s) => s._id === id);
    if (idx === -1) return false;
    store.skills.splice(idx, 1);
    persistStore();
    return true;
  },
};
