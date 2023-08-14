require('dotenv').config();

const {target, mappings} = require('./mappings/fb_to_es_invoices.json');

const SyncManager = require('./src/sync');

const syncManager = new SyncManager();

async function startSync() {
    syncManager.startSync(mappings);
}

async function updateSync() {
    const newMappings = mappings;
    syncManager.startSync(newMappings);
}

async function initSync() {
    await syncManager.createSchema(mappings, target);
    console.log("Schema created");
}

initSync()
    .then(() => startSync())
    .catch(console.error);



