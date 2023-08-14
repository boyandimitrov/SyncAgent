const elastic = require("./es.js");
const bigquery = require("./bq.js");
const firestore = require("./firestore.js");

const InputDataSources = {
    es: {
        search: elastic.search
    },
    fb: {
        search: firestore.search
    }
};

const OutputDataSources = {
    bq: {
        getLastSyncRecord: bigquery.getLastSyncRecord,
        insertRows: bigquery.insertRows,
        createSchema : bigquery.createSchema
    },
    es: {
        getLastSyncRecord: elastic.getLastSyncRecord,
        insertRows: elastic.insertRows,
        createSchema : elastic.createSchema
    }
};


module.exports = {
    InputDataSources, OutputDataSources
}