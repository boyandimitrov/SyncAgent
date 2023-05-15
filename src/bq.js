const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery({
    projectId: process.env.BQ_ID,
    keyFilename: process.env.BQ_CERT_FILE,
});

async function createSchema(mappings) {
    for ( const mapping of mappings) {
        const tableName = mapping.bq;
        const columns = mapping.mapping.map(({bq_column, bq_type}) => {
            return {
                name: bq_column, 
                type: bq_type,
            }
        })

        await createTable(tableName, columns );
    }
}

async function createTable(tableName, schema) {

    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const table = dataset.table(tableName);

    // Check if the table exists
    const [exists] = await table.exists();

    if (!exists) {
        // Only create the table if it does not exist
        await table.create({ schema });
    }
    console.log(`Table ${table.id} created.`);
}

async function getLastSyncTimestamp(tableName) {
    const query = `SELECT MAX(timestamp) as last_sync_timestamp FROM ${process.env.BQ_DATASET}.${tableName}`;
    const options = {
        query: query,
        location: 'US',
    };
    const [rows] = await bigquery.query(options);
    return rows[0].last_sync_timestamp?.value;
}

async function insertRows (tableName, rows) {
    
    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const table = dataset.table(tableName);

    await table.insert(rows, { ignoreUnknownValues: true });
}

module.exports = {
    createSchema, createTable, getLastSyncTimestamp, insertRows
}