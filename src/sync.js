const es = require('./es');
const bq = require('./bq');
const EventEmitter = require('events');

class SyncManager extends EventEmitter {
    constructor() {
        super();
        this.shouldContinueSync = true;
    }

    async synchronize(mapping) {
        let latestTimestamp = await bq.getLastSyncTimestamp(mapping.bq);
        let latestId = null; // Initialize the latest ID
        
        while (this.shouldContinueSync) {
            const rows = await es.search(mapping, latestTimestamp, latestId);
            if (rows.length === 0) {
                console.log('No new data to sync');
                return latestTimestamp;
            }
        
            console.log('insert rows');
            await bq.insertRows(mapping.bq, rows);
    
            // Remember the timestamp of the last synced document
            latestTimestamp = rows[rows.length - 1][mapping.sync_column];
            latestId = rows[rows.length - 1][mapping.id_column];
            console.log(`Synced ${rows.length} rows`);
            return latestTimestamp;
        }
    }

    getSyncInterval(latestTimestamp) {
        // Calculate the difference between now and the latest timestamp
        const diff = Date.now() - new Date(latestTimestamp);

        // Define the interval based on the difference
        let interval;
        if (diff < 5 * 60 * 1000) {       // less than 5 minutes
            interval = 1 * 1000;           // 1 second
        } else if (diff < 24 * 60 * 60 * 1000) {  // less than 24 hours
            interval = 60 * 1000;          // 1 minute
        } else {                           // more than 24 hours
            interval = 60 * 60 * 1000;     // 1 hour
        }

        interval = 1 * 1000;
        return interval;
    }

    async syncAndSetTimeout(mapping) {
        if (!this.shouldContinueSync) {
            return;
        }

        await this.synchronize(mapping);
        const interval = this.getSyncInterval(mapping);
        setTimeout(() => this.syncAndSetTimeout(mapping), interval);
    }

    startSync(mappings) {
        this.shouldContinueSync = true;
        mappings.forEach(mapping => {
            this.syncAndSetTimeout(mapping);
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
