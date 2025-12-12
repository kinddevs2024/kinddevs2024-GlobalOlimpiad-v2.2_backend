import { readDB, writeDB, generateId } from './json-db.js';

// Read all drafts
export function getAllDrafts() {
  return readDB('drafts') || [];
}

// Find draft by user and olympiad
export function findDraftByUserAndOlympiad(userId, olympiadId) {
  const drafts = getAllDrafts();
  return drafts.find((draft) => 
    draft.userId === userId && draft.olympiadId === olympiadId
  );
}

// Create or update draft
export function saveDraft(draftData) {
  const drafts = getAllDrafts();
  const existingIndex = drafts.findIndex(
    (draft) => draft.userId === draftData.userId && draft.olympiadId === draftData.olympiadId
  );

  const draft = {
    _id: existingIndex !== -1 ? drafts[existingIndex]._id : generateId(),
    userId: draftData.userId,
    olympiadId: draftData.olympiadId,
    answers: draftData.answers || {},
    updatedAt: new Date().toISOString(),
    createdAt: existingIndex !== -1 ? drafts[existingIndex].createdAt : new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    drafts[existingIndex] = draft;
  } else {
    drafts.push(draft);
  }

  writeDB('drafts', drafts);
  return draft;
}

// Delete draft
export function deleteDraft(userId, olympiadId) {
  const drafts = getAllDrafts();
  const filtered = drafts.filter(
    (draft) => !(draft.userId === userId && draft.olympiadId === olympiadId)
  );
  writeDB('drafts', filtered);
  return true;
}

export default {
  getAllDrafts,
  findDraftByUserAndOlympiad,
  saveDraft,
  deleteDraft,
};

