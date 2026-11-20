import { getStore, persistStore } from '../config/database.js';
import { generateObjectId } from '../utils/crypto.js';

export const ReviewSchemaDefinition = {
  sessionId: { type: 'ObjectId', ref: 'Session', required: true },
  reviewerId: { type: 'ObjectId', ref: 'User', required: true },
  reviewedUserId: { type: 'ObjectId', ref: 'User', required: true },
  rating: { type: 'Number', min: 1, max: 5, required: true },
  comment: { type: 'String', required: true },
  createdAt: { type: 'Date' },
};

export const ReviewModel = {
  findAll() {
    return getStore().reviews;
  },
  findByReviewedUserId(userId) {
    return getStore().reviews.filter((r) => r.reviewedUserId === userId);
  },
  findByReviewerId(userId) {
    return getStore().reviews.filter((r) => r.reviewerId === userId);
  },
  create(data) {
    const store = getStore();
    const doc = {
      _id: generateObjectId(),
      sessionId: data.sessionId,
      reviewerId: data.reviewerId,
      reviewedUserId: data.reviewedUserId,
      rating: Number(data.rating),
      comment: data.comment,
      createdAt: new Date().toISOString(),
    };
    store.reviews.push(doc);
    persistStore();
    return doc;
  },
};
