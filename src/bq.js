const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery({
    projectId: process.env.BQ_ID,
    keyFilename: process.env.BQ_CERT_FILE,
});

async function createTable(tableName) {
    const schema = [
        {name: 'id', type: 'INTEGER'},
        {name: 'name', type: 'STRING'},
        {name: 'email', type: 'STRING'},
        {name: 'signup_date', type: 'DATE'},
        {name: 'timestamp', type: 'TIMESTAMP'}
    ];

    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const [table] = await dataset.createTable(tableName, {schema});
    console.log(`Table ${table.id} created.`);
}

async function getLastSyncTimestamp(tableName) {
    const query = `SELECT MAX(timestamp) as last_sync_timestamp FROM ${process.env.BQ_DATASET}.${tableName}`;
    const options = {
        query: query,
        location: 'US',
    };
    const [rows] = await bigquery.query(options);
    return rows[0].last_sync_timestamp;
}

async function insertData (tableName, rows) {
    
    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const table = dataset.table(tableName);

    await table.insert(rows);
}

module.exports = {
    createTable, getLastSyncTimestamp, insertData
}