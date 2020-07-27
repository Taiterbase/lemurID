//Authorization: Bearer <token>
const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (bearerHeader === undefined) return res.sendStatus(403);
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, process.env.SECRET, (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        }
        req['authData'] = authData;
        next();
    });
}