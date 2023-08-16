const admin = require("firebase-admin");
const convertor = require("../convertors/firestore");

const serviceAccount = require("../../certs/promoto-bcaef-firebase-adminsdk-s666c-303061354d.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://promoto-bcaef-default-rtdb.europe-west1.firebasedatabase.app"
});

const fbClient = admin.firestore();

async function _search(mapping, latestTimestamp, latestId) {
    let rows = [];

    const collection = fbClient.collection(mapping[mapping.source])

    let query1 = collection.orderBy(mapping.sync_src_column, 'asc').orderBy(mapping.sync_src_id_column, 'asc');

    if (latestTimestamp !== null) {
        query1 = query1.where(mapping.sync_src_column, '>', latestTimestamp);
    }
    
    query1 = query1.limit(mapping.sync_batch_size || 5);

    const querySnapshot = await query1.get();
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        let row = doc.data();
        row.id = doc.id;
        rows.push(row);
    });
        // let query2 = db.collection(mapping.es)
        // .where(mapping.sync_column, '>=', latestTimestamp)
        // .where(mapping.id_column, '>', latestId)
        // .orderBy(mapping.sync_column, 'asc')
        // .orderBy(mapping.id_column, 'asc')
        // .limit(mapping.sync_batch_size || 5);
    

    let i = 0;

    if ( rows?.length) {
        ///retrieve subcollections one level. if need support for more levels , need new implementation
        const subs = mapping.mapping.filter(({strategy}) => strategy === "foreign_table");

        for (const row of rows ) {
            for ( const sub of subs) {
                const subSnapshot = await fbClient.collection(mapping[mapping.source]).doc(row.id).collection(sub.fb_table).get();
      
                row[sub.fb_table] = [];
                subSnapshot.forEach((subDoc) => {
                    console.log(subDoc.id, " => ", subDoc.data());
                    const item = subDoc.data()
                    item.id = subDoc.id;
                    row[sub.fb_table].push(item);
                });
            }
        }
    }

    return rows;
}

async function search(mapping, latestTimestamp, latestId) {
    const docs = await _search(mapping, latestTimestamp, latestId);

    if (docs?.length) {
        const {rows, bridgeRows} = convertor.firestoreToUniversal(docs, mapping);

        // Remember NEWest timestamp of the last synced document
        syncTimestamp = docs[docs.length - 1][mapping.sync_src_column];
        syncId = docs[docs.length - 1][mapping.sync_src_id_column];
    
        return {rows, bridgeRows, syncTimestamp, syncId};
    }

    return {rows:[]};
}

async function createSchema(mappings) {
}

async function getLastSyncRecord(collectionName, sync_trgt_col, sync_trgt_id_col) {
    try {
        const collection = fbClient.collection(collectionName);

        // Create a query: sort by date_updated desc, and then id desc, and limit to 1 document
        const query = collection
            .orderBy(sync_trgt_col, 'desc')
            .orderBy(sync_trgt_id_col, 'desc')
            .limit(1);

        // Execute the query
        const snapshot = await query.get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            return { syncId: data[sync_trgt_id_col], syncTimestamp: data[sync_trgt_col] };
        }
    } catch (error) {
        console.error('Error querying Firestore:', error);
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

async function insertRows(collectionName, rows) {
    try {
        const collection = fbClient.collection(collectionName);
        const batch = fbClient.batch();

        // Add each row as a new document to the batch
        //let rowId = rows[0].id;
        rows.forEach(row => {
            // If row has an ID, use it, otherwise Firestore generates one
            const docRef = row.id ? collection.doc(row.id) : collection.doc();
            batch.set(docRef, row);
        });

        // Commit the batch
        await batch.commit();

//         const docRef = fbClient.collection("users_1").doc(rowId);
// const doc = await docRef.get();
// if (!doc.exists) {
//   console.log('No such document!');
// } else {
//   console.log('Document data:', doc.data());
// }
    } catch (error) {
        console.error('Error inserting documents into Firestore:', error);
    }
}

module.exports = {
    search, createSchema, getLastSyncRecord, insertRows
}