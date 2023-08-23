require('dotenv').config();

const TransManager = require('./src/trans');

const syncManager = new TransManager();

async function startSync() {
    syncManager.startSync();
}

async function initSync() {
    console.log("Sync started");
}

initSync()
    .then(() => startSync())
    .catch(console.error);



