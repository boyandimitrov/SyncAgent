const {SourceDataSources, TargetDataSources} = require("./sources/register");
const bq = require('./sources/bq');
const {transformResponse} = require('./convertors/elastic');
const EventEmitter = require('events');
const importer = require("../AppUI/core/db")
const {log} = require('./LogService');

const CustomStrategyEmitter = require('./emitter');

const customEmitter = new CustomStrategyEmitter();
class SyncManager extends EventEmitter {
    constructor() {
        super();
        this.shouldContinueSync = true;
        this.loadedFakers = {};
    }

    async loadFakers(fakers) {
        let loaded = Object.keys(this.loadedFakers);
        
        let difference = fakers.filter(value => !loaded.includes(value));

        if (difference?.length ) {
            let tables = await importer.load_tables(difference, {dataset : "Mall"});

            this.loadedFakers = {...this.loadedFakers, ...tables};

        }
    }

    async synchronize(mapping) {

        let {syncId, syncTimestamp} = await TargetDataSources[mapping.target].getLastSyncRecord(mapping[mapping.target], mapping.sync_trgt_column, mapping.sync_trgt_id_column);
        
        while (this.shouldContinueSync) {
            //const hits = await InputDataSources[this.source].search(mapping, syncTimestamp, syncId);

            if ( mapping.fakers?.length) {
                await this.loadFakers(mapping.fakers);
                mapping.loadedFakers = this.loadedFakers;
            }

            const searchResults = await SourceDataSources[mapping.source].search(mapping, syncTimestamp, syncId);
            //const {rows, bridgeRows} = transformResponse(hits, mapping.mapping);
            if (searchResults.rows?.length > 0) {
                console.log(`insert rows in ${mapping[mapping.target]}`);
                log({
                    type: "info",
                    title : `insert rows in ${mapping[mapping.target]}`,
                    message : `insert rows in ${mapping[mapping.target]}`,
                    meta: {target : mapping[mapping.target], rows: searchResults.rows.slice(0,10)}
                }) 
                await TargetDataSources[mapping.target].insertRows(mapping[mapping.target], searchResults.rows);

                await customEmitter.emit('rowsUpserted', {table: mapping[mapping.target], rows: searchResults.rows});
            }

            if ( searchResults.bridgeRows && Object.keys(searchResults.bridgeRows).length > 0) {
                for ( const bridge in searchResults.bridgeRows ) {
                    await TargetDataSources[mapping.target].insertRows(bridge, searchResults.bridgeRows[bridge]);
                }
            }

            if (!searchResults.rows?.length) {
                console.log('No new data to sync');
                log({
                    type: "info",
                    title : 'No new data to sync',
                    message : 'No new data to sync',
                    meta: {rows: {}}
                }) 

                return syncTimestamp;
            }
    
            // Remember the timestamp of the last synced document
            syncTimestamp = searchResults.syncTimestamp;
            syncId = searchResults.syncId;
            console.log(`Synced ${searchResults.rows?.length} ${mapping[mapping.target]} rows`);
            log({
                type: "info",
                title : `Synced ${searchResults.rows?.length} ${mapping[mapping.target]} rows`,
                message : `Synced ${searchResults.rows?.length} ${mapping[mapping.target]} rows`,
                meta: {target : mapping[mapping.target], firstRows: searchResults.rows.slice(0,10)}
            }) 
    }
    }

    getSyncInterval(latestTimestamp) {
        // Calculate the difference between now and the latest timestamp
        const diff = Date.now() - new Date(latestTimestamp);

        // Define the interval based on the difference
        let interval;
        if (diff < 5 * 60 * 1000) {       // less than 5 minutes
            console.log('1 second interval')
            interval = 1 * 1000;           // 1 second
        } else if (diff < 24 * 60 * 60 * 1000) {  // less than 24 hours
            console.log('1 minute interval')
            interval = 60 * 1000;          // 1 minute
        } else {                           // more than 24 hours
            console.log('1 hour interval')
            interval = 60 * 60 * 1000;     // 1 hour
        }

        log({
            type: "info",
            title : `current sync interval`,
            message : `current sync interval`,
            meta: {interval}
        }) 

        console.log('1 second interval reset by should comment code');
        interval = 1 * 1000;
        return interval;
    }

    async syncAndSetTimeout(mapping) {
        if (!this.shouldContinueSync) {
            return;
        }

        let latestTimestamp = await this.synchronize(mapping);

        const interval = this.getSyncInterval(latestTimestamp);
        setTimeout(() => this.syncAndSetTimeout(mapping), interval);
    }

    startSync(mappings) {
        this.shouldContinueSync = true;
        mappings.forEach(mapping => {
            if ( mapping[mapping.source] !== 'system' ) {
                this.syncAndSetTimeout(mapping);
            }
        });
    }

    async init(mappings, source) {
        await SourceDataSources[source].init(mappings);
    }

    async createSchema(mappings, target) {
        await TargetDataSources[target].createSchema(mappings);
    }

    stopSync() {
        this.shouldContinueSync = false;
        this.emit('stopSync');
    }

    updateMappings(newMappings) {
        this.stopSync();
        this.once('stopSync', () => this.startSync(newMappings));
    }
}

module.exports = SyncManager;
