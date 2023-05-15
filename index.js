require('dotenv').config();

const bq = require('./src/bq');
const {synchronize} = require('./src/sync');
const mappings = require('./mappings.json');

async function startSync() {
    for ( const mapping of mappings) {
        await synchronize(mapping);
    }
}

async function initSync() {
    await bq.createSchema(mappings);
    console.log("BQ schema created");
}

initSync()
    .then(() => startSync())
    .catch(console.error);



