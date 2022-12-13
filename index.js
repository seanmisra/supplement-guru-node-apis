const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient } = require('mongodb');
const PORT = process.env.PORT || 8080;
let supplementCluster = null;

let uri = process.env.DATABASE_URL;
let mongoClient = new MongoClient(uri);
connectToDB().catch(console.error);

app.use(express.json()); 

app.use(cors({
    origin: '*' 
}));

app.listen(
    PORT, 
    () => console.log(`server running at http://localhost:${PORT}`)
)

async function connectToDB() {
    try {
        let database = mongoClient.db(process.env.DATABASE_NAME);
        let supplements = database.collection(process.env.COLLECTION_NAME);

        if (!supplements) {
             console.log('errors while connecting to MongoDB');
        } else {
            console.log('MONGO CONNECTED!');
            supplementCluster = supplements
        }
    } finally {
        // await mongoClient.close()
    }
}

app.get('/api/allSupplements', async (req, res) => {
    const options = {
        sort: { name: 1 },
        projection: { _id: 0, name: 1, description: 1, tags: 1 }
    };

    console.log('supplementCluster');
    console.log(supplementCluster);

    const cursor = supplementCluster.find({}, options);

    if ((await cursor.count()) === 0) {
        console.log('No supplement data found!');
        res.send({error: 'No supplement data found!'});
    } else {
        allSupplementData = await cursor.toArray();
        res.send(allSupplementData);
    }
})