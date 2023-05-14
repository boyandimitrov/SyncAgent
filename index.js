require('dotenv').config();

const { Client } = require('@elastic/elasticsearch');
const cron = require('node-cron');
const bq = require('./src/bq');


const USERS = "users";

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
});

function parseElasticsearchResponse(response) {
    return response.body.hits.hits.map(hit => hit._source);
}

async function syncElasticsearchToBigQuery() {
    const latestTimestamp = await bq.getLastSyncTimestamp(USERS);

    const esResponse = await esClient.search({
        index: 'users',
        body: {
        query: {
            range: {
                timestamp: {
                    gt: latestTimestamp,
                },
            },
        },
        },
    });

    const data = parseElasticsearchResponse(esResponse);

    bq.insertData(USERS, data)
}

// Schedule the job to run every hour
cron.schedule('0 * * * *', async function() {
    console.log('Running sync job');
    
    await bq.createTable(USERS);

    syncElasticsearchToBigQuery().catch(console.error);
});