const User = require('../schema/User');
const Course = require('../schema/Course');

exports.toggleWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'courseId is required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const user = await User.findById(userId);
        const isWishlisted = user.wishlist.includes(courseId);

        if (isWishlisted) {
            // Remove from wishlist
            user.wishlist = user.wishlist.filter(id => id.toString() !== courseId.toString());
        } else {
            // Add to wishlist
            user.wishlist.push(courseId);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: isWishlisted ? 'Removed from wishlist.' : 'Added to wishlist.',
            data: { isWishlisted: !isWishlisted }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle wishlist.',
            error: error.message
        });
    }
};

exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).populate({
            path: 'wishlist',
            populate: { path: 'instructorId', select: 'name avatar' }
        });

        return res.status(200).json({
            success: true,
            message: 'Wishlist fetched.',
            data: { wishlist: user.wishlist }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch wishlist.',
            error: error.message
        });
    }
};

exports.clearWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        user.wishlist = [];
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Wishlist cleared.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to clear wishlist.',
            error: error.message
        });
    }
};
