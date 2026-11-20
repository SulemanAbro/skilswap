import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const UserSchemaDefinition = {
  name: { type: 'String', required: true },
  email: { type: 'String', required: true, unique: true },
  passwordHash: { type: 'String', required: true },
  university: { type: 'String', required: true },
  department: { type: 'String', required: true },
  semester: { type: 'String', required: true },
  profilePicture: { type: 'String', default: '' },
  bio: { type: 'String', default: '' },
  role: { type: 'String', enum: ['student', 'admin'], default: 'student' },
  status: { type: 'String', enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: 'Date' },
};

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export const UserModel = {
  findAll() {
    return getStore().users;
  },
  findById(id) {
    return getStore().users.find((u) => u._id === id) || null;
  },
  findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return getStore().users.find((u) => u.email.toLowerCase() === normalized) || null;
  },
  create(data) {
    const store = getStore();
    const doc = {
      _id: generateObjectId(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      university: data.university,
      department: data.department,
      semester: data.semester,
      profilePicture: data.profilePicture || '',
      bio: data.bio || '',
      role: data.role || 'student',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };
    store.users.push(doc);
    persistStore();
    return doc;
  },
  updateById(id, updates) {
    const store = getStore();
    const idx = store.users.findIndex((u) => u._id === id);
    if (idx === -1) return null;
    store.users[idx] = { ...store.users[idx], ...updates };
    persistStore();
    return store.users[idx];
  },
};
