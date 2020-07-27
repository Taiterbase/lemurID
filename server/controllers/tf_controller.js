require('dotenv').config({
    path: `../.env`,
});

const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const mobilenetModule = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');
const sharp = require('sharp');
const knex = require("knex")({
    client: 'mssql',
    connection: {
        host: process.env.REACT_APP_DB_SERVER,
        user: process.env.REACT_APP_DB_USER,
        password: process.env.REACT_APP_DB_PASS, //CHANGE THIS IN THE .env FILE!
        database: process.env.REACT_APP_DB, //CHANGE THIS IN THE .env FILE!
        encrypt: true,
        TrustServerCertificate: false
    },
    acquireConnectionTimeout: process.env.REACT_APP_COOKIE_EXPIRATION_MS
});

//will need refactoring to get image data from database instead
//of filesystem reading.
exports.create_model = async (req, res) => {
    const dir = './sorted'; //assumes image directory is in root of server
    const classifier = knnClassifier.create();
    const mobilenet = await mobilenetModule.load();
    const files = fs.readdirSync(dir);
    if (!files)
        console.log("Error reading folders");
    console.log("reading directory...");
    for (let folder = 0; folder < files.length; folder++) {
        if (files[folder] === "test") {
            continue;
        }
        const images = fs.readdirSync(dir + "/" + files[folder]);
        if (!images)
            console.log("error reading image folder");
        console.log("Looking into folder: " + files[folder]);
        for (let img = 0; img < images.length; img++) {
            //console.log("Looking into file: " + files[folder] + "/" + images[img]);
            let imgPath = dir + "/" + files[folder] + "/" + images[img];
            const imageBuffer = await sharp(imgPath).jpeg({ quality: 100, progressive: true }).resize(500).toBuffer();
            const tensor = tf.node.decodeImage(imageBuffer);// create a tensor for the image
            const logits = mobilenet.infer(tensor, 'conv_preds');
            classifier.addExample(logits, files[folder]);
            console.log("added tensor example " + images[img] + " to: " + files[folder]);
        };
    }
    let dataset = classifier.getClassifierDataset();
    let datasetObj = {};
    console.log("dataset:", dataset);
    Object.keys(dataset).forEach((key) => {
        let data = dataset[key].dataSync();
        datasetObj[key] = Array.from(data);
    });
    let jsonStr = JSON.stringify(datasetObj);
    fs.writeFileSync("model.json", jsonStr);

    classifier.dispose(); //dispose classifier and all internal state...
    //console.log("wrote to model.json");
    return res.sendStatus(200); //we did eeeet
};

exports.get_prediction_test = async (req, res) => {
    let model = fs.readFileSync("model.json");
    model = JSON.parse(model);
    Object.keys(model).forEach(key => {
        model[key] = tf.tensor(model[key], [model[key].length / 1024, 1024]);
    });
    const classifier = knnClassifier.create();
    const mobilenet = await mobilenetModule.load();
    classifier.setClassifierDataset(model);
    //test image
    const imageBuffer = await sharp("./test/GOUTY.JPG").jpeg({ quality: 100, progressive: true }).resize(500).toBuffer();
    const tensor = tf.node.decodeImage(imageBuffer)
    const logits = mobilenet.infer(tensor, 'conv_preds');
    const result = await classifier.predictClass(logits);
    fs.writeFileSync("test_results.json", JSON.stringify(result), err => { if (err) throw err; });
    //console.log("wrote to test_results.json");
    //console.log("Resulting label from prediction: ", result.label);
    classifier.dispose();
    return res.sendStatus(200);
}

//Look up the "Knex" documentation for questions.
//how to make a database connection
exports.database_test = async (req, res) => {
    //can remove param and question marks if stored procedure is not expecting parameters.
    knex.raw(
        "EXEC STORED_PROCEDURE"
        ).then(resp => {
            res.status(200);
            console.log(resp[0]);
            console.log(resp);
            return res.send(resp);
        }).catch(err => {
            console.log(err);
            return res.sendStatus(500);
        })
}