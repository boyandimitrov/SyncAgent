const { Client } = require('@elastic/elasticsearch');
const transformers = require('./transformers');

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
});

function parseElasticsearchResponse(esResponse, mapping) {
    return esResponse.body.hits.hits.map((hit) => {
        const parsedRow = {};
        for (let field of mapping) {
            const transformer = field.transformer;

            let value = null;
            try{
                value = hit._source[field.es_column];

                if (transformer && transformers[transformer]) {
                    value = transformers[transformer](value);
                }
            }
            catch(e) {
                console.error(e);
                value = null;
            }

            if ( value !== null && typeof value !== undefined) {
                parsedRow[field.bq_column] = value;
            }
        }
        return parsedRow;
    });
}

async function search(mapping, latestTimestamp, latestId) {
    const esResponse = await esClient.search({
        index: mapping.es,
        body: {
            size: mapping.sync_batch_size || 5,
            sort: [
                { [mapping.sync_column]: { order: 'asc' } },
                { [`${mapping.id_column}.keyword`]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
            ],
            query: {
                bool: {
                    filter: [
                        {
                            range: {
                                [mapping.sync_column]: { gt: latestTimestamp }
                            }
                        },
                        {
                            bool: {
                                must: [
                                    {
                                        range: { 
                                            [mapping.sync_column]: { 
                                                gte: latestTimestamp 
                                            } 
                                        }
                                    },
                                    {
                                        range: { 
                                            [mapping.id_column]: { 
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
    });

    const rows = parseElasticsearchResponse(esResponse, mapping.mapping);
    return rows;
}

module.exports = {
    search
}