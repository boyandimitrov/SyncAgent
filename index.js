require('dotenv').config();

const mappings = require('./mappings.json');

const bq = require('./src/sources/bq');
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
    await bq.createSchema(mappings);
    console.log("BQ schema created");
}

initSync()
    .then(() => startSync())
    .catch(console.error);



