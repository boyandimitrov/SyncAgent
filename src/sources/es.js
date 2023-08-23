const { Client } = require('@elastic/elasticsearch');
const { v4: uuidv4 } = require('uuid');

const {transformers} = require('../transformers');
const convertor = require("../convertors/elastic");

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
});

const IDX_RESOURCES = "resources";

async function _search(mapping, latestTimestamp, latestId) {
    let body = {
        size: mapping.sync_batch_size || 5,
        // sort: [
        //     // { [mapping.sync_column]: { order: 'asc' } },
        //     // { [mapping.id_column]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
        //     { [mapping.sync_src_column]: { order: 'desc' } },
        //     { [`${mapping.sync_src_id_column}`]: { order: 'desc' } }
        //     //{ [`${mapping.sync_src_id_column}.keyword`]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
        // ],
        sort: [
            // { [mapping.sync_column]: { order: 'asc' } },
            // { [mapping.id_column]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
            {[mapping.sync_src_column]: { order: 'asc' } },
            {[`${mapping.sync_src_id_column}`]: { order: 'asc' }} 
            //{ [`${mapping.sync_src_id_column}.keyword`]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
        ],
        query: {
            range: {[mapping.sync_src_column]: { gte: latestTimestamp }}
        }
    }
    if ( latestTimestamp && latestId ) {
        body.search_after = [latestTimestamp, latestId];
    }

    const query = {
        index: mapping.es,
        body: body
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
        // syncTimestamp = hits[hits.length - 1]?._source?.[mapping.sync_src_column];
        // syncId = hits[hits.length - 1]?.[mapping.sync_src_id_column];
        syncTimestamp = hits[hits.length - 1]?._source?.[mapping.sync_src_column];
        syncId = hits[hits.length - 1]?.[mapping.sync_src_id_column];
    
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

//FUNCTIONS THAT FOLLOW ARE FOR TRANSACTIONS

async function createResources() {
    try {
        // Check if index already exists
        const exists = await esClient.indices.exists({ index: IDX_RESOURCES });
        if (exists.body) {
            console.log('Index already exists. Exiting.');
            return;
        }
  
        // Create the index
        const response = await esClient.indices.create({
            index: IDX_RESOURCES,
            body: {
                mappings: {
                    properties: {
                        identifier: {
                            type: 'text',
                            fields: {
                                keyword: {
                                    type: 'keyword', // this sub-field allows exact match searches
                                }
                            }
                        },
                        lastSync: {
                            type: 'date'
                        }
                    }
                }
            }
        });
        console.log('Index created:', response);
    } 
    catch (error) {
        console.error('Error creating index:', error);
    }
}

async function searchResources(url) {
    try {
        const response = await esClient.search({
        index: IDX_RESOURCES,
        body: {
            query: {
                term: {
                    "identifier.keyword": url
                }
            }
        }
        });
    
        console.log('Search results:', response.body.hits.hits);
    } 
    catch (error) {
        console.error('Error searching documents:', error);
    }
}

async function getLastSyncResource() {
    await createResources();

    const hit = await searchResources(process.env.ELASTICSEARCH_URL);

    return hit;
}

async function saveLastSyncResource(id, lastSync) {
    await createResources();

    if (!id) {
        id = uuidv4();
    }

    const doc = {
        identifier: process.env.ELASTICSEARCH_URL,
        lastSync: new Date(lastSync).toISOString()
    };

    try {
        const response = await esClient.update({
            index: IDX_RESOURCES,
            id: id,
            body: {
                doc: doc,
                upsert: doc
            }
        });
    
        console.log('Upsert response:', response.body);
    } 
    catch (error) {
        console.error('Error upserting document:', error);
    }
}

async function updateShopQuantities(rows) {
    try {
        const response = await esClient.updateByQuery({
            index: 'stock',
            body: {
                script: {
                    source: `
                        for (int i = 0; i < params.products.length; i++) {
                            if (ctx._source.product_id == params.products[i].id) {
                                ctx._source.quantity -= params.products[i].sold;
                                break;
                            }
                        }
                    `,
                    lang: 'painless',
                    params: {
                        products: [
                            {
                                id: 'product_001',
                                sold: 40
                            },
                            {
                                id: 'product_002',
                                sold: 30
                            }
                            // ... Add more products with their respective sold quantities.
                        ]
                    }
                },
                query: {
                        terms: {
                            'product_id.keyword': ['product_001', 'product_002'] // ... Add more product IDs as needed.
                        }
                    },
                size: 100
            }
        });
    
        console.log('Update results:', response.body);
    } 
    catch (error) {
        console.error('Error updating stock quantities:', error);
    }
}

module.exports = {
    search, createSchema, getLastSyncRecord, insertRows, updateShopQuantities, getLastSyncResource, saveLastSyncResource
}