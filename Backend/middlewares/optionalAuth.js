const jwt = require('jsonwebtoken');
const User = require('../schema/User');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        let token = null;

        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
            req.user = user;
        }
        
        return next();
    } catch (error) {
        // Just proceed without user if token is invalid
        return next();
    }
};
