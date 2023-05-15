const es = require('./es');
const bq = require('./bq');

async function synchronize(mapping) {
    let latestTimestamp = await bq.getLastSyncTimestamp(mapping.bq);
    let latestId = null; // Initialize the latest ID

    while (true) {
        console.log('het rows');
        const rows = await es.search(mapping, latestTimestamp, latestId);
        if (rows.length === 0) {
            console.log('No new data to sync');
            return;
        }

        console.log('insert rows');
        await bq.insertRows(mapping.bq, rows);

        // Remember the timestamp of the last synced document
        latestTimestamp = rows[rows.length - 1][mapping.sync_column];
        latestId = rows[rows.length - 1][mapping.id_column];
        console.log(`Synced ${rows.length} rows`);
    }
}

module.exports = {
    synchronize
}