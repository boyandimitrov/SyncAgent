const { Client } = require('@elastic/elasticsearch');
const {transformers} = require('../transformers');
const convertor = require("../convertors/elastic");

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
});

async function _search(mapping, latestTimestamp, latestId) {
    const query = {
        index: mapping.es,
        body: {
            size: mapping.sync_batch_size || 5,
            sort: [
                // { [mapping.sync_column]: { order: 'asc' } },
                // { [mapping.id_column]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
                { [mapping.sync_src_column]: { order: 'asc' } },
                { [`${mapping.sync_src_id_column}`]: { order: 'asc' } }
                //{ [`${mapping.sync_src_id_column}.keyword`]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
            ],
            query: {
                bool: {
                    should: [
                        {
                            range: {
                                [mapping.sync_src_column]: { gt: latestTimestamp }
                            }
                        },
                        {
                            bool: {
                                must: [
                                    {
                                        range: { 
                                            [mapping.sync_src_column]: { 
                                                gte: latestTimestamp 
                                            } 
                                        }
                                    },
                                    {
                                        range: { 
                                            [`${mapping.sync_src_id_column}`]: { 
                                                gt: latestId 
                                            } 
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
        },
    };

    console.log(JSON.stringify(query));

    const esResponse = await esClient.search(query);

    return esResponse.body.hits.hits;    
    // const rows = parseElasticsearchResponse(esResponse, mapping.mapping);
    // return rows;
}

async function search(mapping, latestTimestamp, latestId) {
    const hits = await _search(mapping, latestTimestamp, latestId);

    if (hits && hits.length > 0) {
        const {rows, bridgeRows} = convertor.elasticToUniversal(hits, mapping.mapping, mapping.loadedFakers);

        // Remember NEWest timestamp of the last synced document
        // syncTimestamp = hits[hits.length - 1]?._source?.[mapping.sync_column];
        //syncId = hits[hits.length - 1]?._source?.[mapping.sync_id_column];
        syncTimestamp = hits[hits.length - 1]?._source?.[mapping.sync_src_column];
        syncId = hits[hits.length - 1]?._source?.[mapping.sync_src_id_column];
    
        return {rows, bridgeRows, syncTimestamp, syncId};
    }

    return {rows:[]};
}

async function createSchema(mappings) {
}

async function getLastSyncRecord(indexName, sync_trgt_col, sync_trgt_id_col) {
    try {
        const response = await esClient.search({
            index: indexName,
            body: {
                size: 1,
                sort: [
                    // { "date_updated": { "order": "desc" } },
                    // { "id": { "order": "desc" } }
                    { [`${sync_trgt_col}`]: { "order": "desc" } },
                    { [`${sync_trgt_id_col}`]: { "order": "desc" } }
                ],
                query: {
                    match_all: {}
                }
            }
        });

        const hits = response.body.hits.hits;
        if (hits.length) {
            const source = hits[0]._source;
            // return { syncId: source.id, syncTimestamp: source.date_updated };
            return { syncId: source[sync_trgt_id_col], syncTimestamp: source[sync_trgt_col] };
        }
    } catch (error) {
        console.error('Error querying Elasticsearch:', error);
    }
    
    return { syncId: null, syncTimestamp: null };
}

async function insertRows (indexName, rows) {
    try {
        const body = rows.flatMap(row => [{ index: { _index: indexName } }, row]);

        const response = await esClient.bulk({ refresh: true, body });

        if (response.body.errors) {
            const erroredDocuments = [];
            response.body.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                    erroredDocuments.push({
                        status: action[operation].status,
                        error: action[operation].error,
                        document: body[i * 2 + 1]
                    });
                }
            });
            console.error('Failed documents:', JSON.stringify(erroredDocuments, null, 2));
        }

    } 
    catch (error) {
        console.error('Error inserting documents into Elasticsearch:', error);
    }
}

module.exports = {
    search, createSchema, getLastSyncRecord, insertRows
}