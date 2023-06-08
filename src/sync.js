const {InputDataSources, OutputDataSources} = require("./sources/register");
const bq = require('./sources/bq');
const {transformResponse} = require('./convertors/elastic');
const EventEmitter = require('events');

const CustomStrategyEmitter = require('./emitter');

const customEmitter = new CustomStrategyEmitter();
class SyncManager extends EventEmitter {
    constructor() {
        super();
        this.shouldContinueSync = true;
    }

    async synchronize(mapping) {

        let {syncId, syncTimestamp} = await OutputDataSources[mapping.target].getLastSyncRecord(mapping[mapping.target]);
        
        while (this.shouldContinueSync) {
            //const hits = await InputDataSources[this.source].search(mapping, syncTimestamp, syncId);
            const searchResults = await InputDataSources[mapping.source].search(mapping, syncTimestamp, syncId);
            //const {rows, bridgeRows} = transformResponse(hits, mapping.mapping);
            if (searchResults.rows?.length > 0) {
                console.log(`insert rows in ${mapping[mapping.target]}`);
                await OutputDataSources[mapping.target].insertRows(mapping[mapping.target], searchResults.rows);

                await customEmitter.emit('rowsUpserted', {table: mapping[mapping.target], rows: searchResults.rows});
            }

            if ( searchResults.bridgeRows && Object.keys(searchResults.bridgeRows).length > 0) {
                for ( const bridge in searchResults.bridgeRows ) {
                    await OutputDataSources[mapping.target].insertRows(bridge, searchResults.bridgeRows[bridge]);
                }
            }

            if (!searchResults.rows?.length) {
                console.log('No new data to sync');
                return syncTimestamp;
            }
    
            // Remember the timestamp of the last synced document
            syncTimestamp = searchResults.syncTimestamp;
            syncId = searchResults.syncId;
            console.log(`Synced ${searchResults.rows?.length} ${mapping[mapping.target]} rows`);
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
