import { openDB } from 'idb';

const DB_NAME = 'ReadLibDB';
const DB_VERSION = 1;

export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('category', 'category');
      }
    },
  });
  return db;
}

// Settings (e.g. storing DirectoryHandle)
export async function getSetting(key) {
  const db = await initDB();
  return await db.get('settings', key);
}

export async function setSetting(key, value) {
  const db = await initDB();
  return await db.put('settings', value, key);
}

// Books metadata
export async function getAllBooks() {
  const db = await initDB();
  return await db.getAll('books');
}

export async function saveBook(book) {
  const db = await initDB();
  return await db.put('books', book);
}

export async function deleteBook(id) {
  const db = await initDB();
  return await db.delete('books', id);
}

// Helper to verify/request permission for a handle
export async function verifyPermission(fileHandle, readWrite = false) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  
  if (!fileHandle || !fileHandle.queryPermission) return false;

  // Check if we already have permission, if so, return true.
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission to the file, if the user grants permission, return true.
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}
