const elastic = require("./es.js");
const managed = require("./es_managed.js");
const bigquery = require("./bq.js");
const firestore = require("./firestore.js");

const SourceDataSources = {
    es: {
        init: elastic.init,
        search: elastic.search
    },
    es_managed: {
        init: managed.init,
        search: managed.search
    },
    fb: {
        init: firestore.init,
        search: firestore.search
    }
};

const TargetDataSources = {
    bq: {
        getLastSyncRecord: bigquery.getLastSyncRecord,
        insertRows: bigquery.insertRows,
        createSchema : bigquery.createSchema
    },
    es: {
        getLastSyncRecord: elastic.getLastSyncRecord,
        insertRows: elastic.insertRows,
        createSchema : elastic.createSchema
    },
    es_managed: {
        getLastSyncRecord: managed.getLastSyncRecord,
        insertRows: managed.insertRows,
        createSchema : managed.createSchema
    },
    fb: {
        getLastSyncRecord: firestore.getLastSyncRecord,
        insertRows: firestore.insertRows,
        createSchema : firestore.createSchema
    }
};


module.exports = {
    SourceDataSources, TargetDataSources
}