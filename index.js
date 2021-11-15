const express = require("express");
const app = express();
const {MongoClient} = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const admin = require("firebase-admin");

const port = process.env.PORT || 5000;

const serviceAccount = require('./find-jersey-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
const cors = require("cors");
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r3srk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken (req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];

     try{
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
     }
     catch{
         
     }

  }
  next();
}

async function run() {
  try {
    await client.connect();

    const database = client.db("find-jersey");
    const useServicesCollection = database.collection("products");
    const useOrdersCollection = database.collection("orders");
    const usersCollection = database.collection('users');
    const usersFeedbackCollection = database.collection('reviews');


    // Get All Services
    app.get("/all-services", async (req, res) => {
      const services = await useServicesCollection.find({}).toArray();
      res.send(services);
    });
    app.get("/all-reviews", async (req, res) => {
      const reviews = await usersFeedbackCollection.find({}).toArray();
      res.send(reviews);
    });

    // // // Service DETAILS
    app.get("/service-details/:id", async (req, res) => {
      const ID = req.params.id;
      const service = {_id: ObjectId(ID)};
      const ServicelDetails = await useServicesCollection.findOne(service);
      res.send(ServicelDetails);
    });

    app.get("/allorder", async (req, res) => {
      const orderData = await useOrdersCollection.find({}).toArray();
      res.json(orderData);
    });

    app.post("/add-service", async (req, res) => {
      const serviceData = await useServicesCollection.insertOne(req.body);
      res.json(serviceData);
    });
    app.post("/add-review", async (req, res) => {
      const feedbackData = await usersFeedbackCollection.insertOne(req.body);
      res.json(feedbackData);
    });

    app.delete("/delete-order/:id", async (req, res) => {
      const orderId = req.params.id;
      const order = {_id: ObjectId(orderId)};
      const result = await useOrdersCollection.deleteOne(order);
      res.json(result);
    });

    //UPDATE status code
    app.put("/order-update/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const options = {upsert: true};
      const updateDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await useOrdersCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.json(result);
    });

    //POST Data
    app.post("/add-order", async (req, res) => {
      console.log(req.body);
      const orderData = await useOrdersCollection.insertOne(req.body);
      res.json(orderData);
    });

    app.get("/allorder", async (req, res) => {
      const orderData = await useOrdersCollection.find({}).toArray();
      res.json(orderData);
    });


    app.get("/users/:email", async(req, res) =>{
      const email = req.params.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if(user?.role === 'admin'){
        isAdmin = true;
      }
      res.json({admin: isAdmin});
    });

       app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
       });

       app.put('/users', async(req, res)=>{
        const user = req.body;
        console.log('put', user);
        const filter = {email: user.email};
        const options = {upsert: true};
        const updateDoc = {$set: user};
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
       });

        app.put('/users/admin', verifyToken, async(req, res)=>{
          const user = req.body;
          const requester = req.decodedEmail;
          if(requester){
            const requesterAccount = await usersCollection.findOne({email: requester});
            if(requesterAccount.role === 'admin'){
              const filter = {email: user.email};
              const updateDoc = {$set: {role:'admin'}};
              const result = await usersCollection.updateOne(filter, updateDoc);
              res.json(result);
            }
          }
           else{
             res.status(403).json({message: 'You do not have access to make admin.'});
           }
          
        })


  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Find Jersey is Running");
});

app.listen(port, () => {
  console.log("Find Jersey Server on Port ", port);
});
