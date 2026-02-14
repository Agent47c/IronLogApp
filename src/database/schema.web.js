let db = null;

export const initDatabase = async () => {
  console.warn('SQLite is not supported on web. Using in-memory fallback.');
  return null;
};

export const getDatabase = () => {
  return null;
};

export default {
  initDatabase,
  getDatabase
};
