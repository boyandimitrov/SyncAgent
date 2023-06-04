const { Client } = require('@elastic/elasticsearch');
const {transformers} = require('./transformers');

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
});

// function parseElasticsearchResponse(esResponse, mapping) {
//     return esResponse.body.hits.hits.map((hit) => {
//         const parsedRow = {};
//         for (let field of mapping) {
//             const transformer = field.transformer;

//             let value = null;
//             try{
//                 value = hit._source[field.es_column];

//                 if (transformer && transformers[transformer]) {
//                     value = transformers[transformer](value);
//                 }
//             }
//             catch(e) {
//                 console.error(e);
//                 value = null;
//             }

//             if ( value !== null && typeof value !== undefined) {
//                 parsedRow[field.bq_column] = value;
//             }
//         }
//         return parsedRow;
//     });
// }

function strategyFlatten(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        let value = parseObject(obj[field.es_column], field.flatten, id);
        if (value !== null && typeof value !== 'undefined') {
            return value;
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }

    return null;
}

function strategyForeignKeySimple(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        let value = parseObject(obj[field.es_column], field.fk, id);
        if (value !== null && typeof value !== 'undefined') {
            return value;
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }
}

function strategyForeignKeyType(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        const fk_obj = obj[field.es_column];
        const fk_schema = field.fk[0];

        const type = fk_obj[fk_schema.es_type_column];
        if (!(fk_schema.es_types || []).includes(type)) {
            console.error("unsupported type");
            return null;
        }

        let value = fk_obj[fk_schema.es_column];
        if (value !== null && typeof value !== 'undefined') {
            return {[fk_schema.bq_column + type] : value};
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }
}

function strategyNormal(obj, field, id) {
    try {
        let value = obj[field.es_column];
        const transformer = field.transformer;
        if (transformer && transformers[transformer]) {
            value = transformers[transformer](value);
        }
        return {[field.bq_column] : value};
    }
    catch (e) {
        console.error(e);
    }

    return null
}

function parseObject(obj, mapping, id) {
    let parsedRow = {};
    for (let field of mapping) {
        let value = null;
        switch (field.strategy) {
            case 'flat':
                value = strategyFlatten(obj, field, id);
                break;
            case 'foreign_key_simple':
                value = strategyForeignKeySimple(obj, field, id);
                break;
            case 'foreign_key_type':
                value = strategyForeignKeyType(obj, field, id);
                break;
            default:
                value = strategyNormal(obj, field, id);
        }

        if (value !== null && typeof value !== 'undefined') {
            parsedRow = Object.assign({}, parsedRow, value);
        }

        // // Check if the current field is a nested object
        // if (field.strategy === "flat") {
        //     if ( !field.flatten) {
        //         console
        //     }
        //     // Recursively parse the nested object
        //     if ( obj && obj[field.es_column]) {
        //         value = parseObject(obj[field.es_column], field.flatten, id);
        //         if (value !== null && typeof value !== 'undefined') {
        //             parsedRow = Object.assign({}, parsedRow, value);
        //         }
        //     }
        //     else {
        //         console.log(`${id} has missing value for ${field.es_type}`);
        //     }
        // } 
        // else {
        //     try {
        //         value = obj[field.es_column];
        //         const transformer = field.transformer;
        //         if (transformer && transformers[transformer]) {
        //             value = transformers[transformer](value);
        //         }
        //     }
        //     catch (e) {
        //         console.error(e);
        //         value = null;
        //     }
        //     if (value !== null && typeof value !== 'undefined') {
        //         parsedRow[field.bq_column] = value;
        //     }
        // } 
    }
    return parsedRow;
}

function parseElasticsearchResponse(esResponse, mapping) {
    return esResponse.body.hits.hits.map((hit) => parseObject(hit._source, mapping, hit._source.id));
}

async function search(mapping, latestTimestamp, latestId) {
    const query = {
        index: mapping.es,
        body: {
            size: mapping.sync_batch_size || 5,
            sort: [
                { [mapping.sync_column]: { order: 'asc' } },
                { [mapping.id_column]: { order: 'asc' } } // Assuming 'id' is the name of the ID field
            ],
            query: {
                bool: {
                    should: [
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
    };

    console.log(JSON.stringify(query));

    const esResponse = await esClient.search(query);

    return esResponse.body.hits.hits;    
    // const rows = parseElasticsearchResponse(esResponse, mapping.mapping);
    // return rows;
}

module.exports = {
    search
}