const express = require('express');
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middlewares/auth');

const router = express.Router();

router.use(auth); // All wishlist routes require authentication

router.get('/', wishlistController.getWishlist);
router.post('/toggle', wishlistController.toggleWishlist);
router.delete('/clear', wishlistController.clearWishlist);

module.exports = router;
