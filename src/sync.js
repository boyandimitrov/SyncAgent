const es = require('./es');
const bq = require('./bq');
const {transformResponse} = require('./mapper');
const EventEmitter = require('events');

const CustomStrategyEmitter = require('./emitter');

const customEmitter = new CustomStrategyEmitter();
class SyncManager extends EventEmitter {
    constructor() {
        super();
        this.shouldContinueSync = true;
    }

    async synchronize(mapping) {
        let {syncId, syncTimestamp} = await bq.getLastSyncRecord(mapping.bq);
        
        while (this.shouldContinueSync) {
            const hits = await es.search(mapping, syncTimestamp, syncId);
            const {rows, bridgeRows} = transformResponse(hits, mapping.mapping);
            if (rows?.length > 0) {
                console.log(`insert rows in ${mapping.bq}`);
                await bq.insertRows(mapping.bq, rows);

                await customEmitter.emit('rowsUpserted', {table: mapping.bq, rows: rows});
            }

            if ( bridgeRows && Object.keys(bridgeRows).length > 0) {
                for ( const bridge in bridgeRows ) {
                    await bq.insertRows(bridge, bridgeRows[bridge]);
                }
            }

            if (rows.length === 0) {
                console.log('No new data to sync');
                return syncTimestamp;
            }
    
            // Remember the timestamp of the last synced document
            syncTimestamp = hits[hits.length - 1]._source[mapping.sync_column];
            syncId = hits[hits.length - 1]._source[mapping.sync_id_column];
            console.log(`Synced ${rows.length} ${mapping.bq} rows`);
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
            if ( mapping.es !== 'system' ) {
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
