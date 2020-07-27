const express = require('express');
const port = process.env.SERVER_PORT || 3002;

const lemurRouter = require('./server/routes/lemur-routes.js');

const server = express();

server.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000"); //who can use this api?
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); //with what headers?
    next();
})
server.use(require('body-parser').json());
server.use('/api/lemur', lemurRouter);

server.listen(port, err => {
    if (err) throw err;
    console.log(`Listening on port ${port}`);
});