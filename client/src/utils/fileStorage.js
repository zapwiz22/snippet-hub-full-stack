import { openDB } from "idb";

const DB_NAME = "snippetHubDB";
const FILE_STORE_NAME = "files";

const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(FILE_STORE_NAME)) {
        db.createObjectStore(FILE_STORE_NAME);
        }
    },
});

export async function saveFile(snippetId, file) {
    const db = await dbPromise;
    await db.put(FILE_STORE_NAME, file, snippetId);
}

export async function getFile(snippetId) {
    const db = await dbPromise;
    return await db.get(FILE_STORE_NAME, snippetId);
}