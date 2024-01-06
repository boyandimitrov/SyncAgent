const { Client } = require('@elastic/elasticsearch');
const { v4: uuidv4 } = require('uuid');

const {transformers} = require('../transformers');
const convertor = require("../convertors/elastic");
const {log} = require('../LogService');

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
        log({
            type: "error",
            title : `Error querying Elasticsearch`,
            message : `Error querying Elasticsearch`,
            meta: {error}
        }) 

    }
    
    return { syncId: null, syncTimestamp: null };
}

async function init () {

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
            log({
                type: "error",
                title : `Failed to insert some documents`,
                message : `Failed to insert some documents`,
                meta: {firstErroredDocs: erroredDocuments.slice(0,10)}
            }) 
    
        }

    } 
    catch (error) {
        console.error('Error inserting documents into Elasticsearch:', error);
        log({
            type: "error",
            title : `Error inserting documents into Elasticsearch`,
            message : `Error inserting documents into Elasticsearch`,
            meta: {error}
        }) 

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
        log({
            type: "error",
            title : `Error creating resource index`,
            message : `Error creating resource index`,
            meta: {error}
        }) 

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
        return response.body.hits.hits;
    } 
    catch (error) {
        console.error('Error searching documents:', error);
        log({
            type: "error",
            title : `Error searching documents`,
            message : `Error searching documents`,
            meta: {error}
        }) 

    }
}

async function getLastSyncResource() {
    await createResources();

    const hits = await searchResources(process.env.ELASTICSEARCH_URL);

    if ( hits?.length) {
        return hits[0]._source;
    }
    return {};
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
        log({
            type: "error",
            title : `Error upserting document`,
            message : `Error upserting document`,
            meta: {error}
        }) 

    }
}

async function getBulkData(rows) {
    const body = [];

    for (let item of rows) {
        body.push({ index: 'promoto-stock_new' });
        body.push({
            size: 1,
            query: {
                bool: {
                    must: [
                        { term: { "store.id.keyword": item.fk_store } },
                        { term: { "productBase.id.keyword": item.fk_product } }
                    ]
                }
            }
        });
    }

    const response = await esClient.msearch({ body });

    let results = response.body.responses.map((res, idx) => {
        if (res.hits.hits.length > 0) {
            return {_id : res.hits.hits[0]._id, sold : rows[idx].sold};
        }
        console.error(`No ID found for store: ${rows[idx].fk_store}, productBase: ${rows[idx].fk_product}`);
        log({
            type: "error",
            title : `No ID found for store`,
            message : `No ID found for store`,
            meta: {store: rows[idx].fk_store, productBase: ows[idx].fk_product}
        }) 
        return null;
    });

    return results.filter(item => item !== null);
}

async function updateShopQuantities(rows) {

    const data = await getBulkData(rows);

    // Prepare bulk payload
    const body = [];
    
    data.forEach(item => {
        // Meta-data line
        body.push({
            update: {
                _index: 'promoto-stock_new',
                _id : item._id
            }
        });
    
        // Data line
        body.push({
            script: {
                source: "ctx._source.currentQuantity -= params.sold",
                lang: "painless",
                params: {
                    sold: item.sold  // Assuming you know how much to subtract for each item
                }
            }
        });
    });

    if ( !body.length) {
        return;
    }
    
    // Perform bulk update
    try {
        const response = await esClient.bulk({ body });
        console.log(response);
        // You might want to check for and handle any errors in the response here
    } 
    catch (error) {
        console.error('Bulk update failed:', error);
        log({
            type: "error",
            title : `Bulk update failed`,
            message : `Bulk update failed`,
            meta: {error}
        }) 

    }
}

module.exports = {
    init, search, createSchema, getLastSyncRecord, insertRows, updateShopQuantities, getLastSyncResource, saveLastSyncResource
}