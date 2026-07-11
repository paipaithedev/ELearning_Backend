const Coupon = require('../schema/Coupon');

exports.createCoupon = async (req, res) => {
    try {
        const { code, type, value, minPurchase, expiresAt, usageLimit } = req.body;
        
        if (!code || !value) {
            return res.status(400).json({ success: false, message: 'Code and value are required.' });
        }

        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Coupon code already exists.' });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            type: type || 'percentage',
            value,
            minPurchase: minPurchase || 0,
            expiresAt,
            usageLimit
        });

        return res.status(201).json({
            success: true,
            message: 'Coupon created.',
            data: { coupon }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create coupon.',
            error: error.message
        });
    }
};

exports.listAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Coupons fetched.',
            data: { coupons, count: coupons.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons.',
            error: error.message
        });
    }
};

exports.validateCoupon = async (req, res) => {
    try {
        const { code, amount } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
        }

        // Check expiration
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        // Check usage limit
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
        }

        // Check minimum purchase
        if (amount < coupon.minPurchase) {
            return res.status(400).json({ 
                success: false, 
                message: `Minimum purchase of ${coupon.minPurchase} required for this coupon.` 
            });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (amount * coupon.value) / 100;
        } else {
            discount = Math.min(coupon.value, amount);
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon is valid.',
            data: {
                coupon: {
                    _id: coupon._id,
                    code: coupon.code,
                    type: coupon.type,
                    value: coupon.value
                },
                discount,
                finalAmount: amount - discount
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate coupon.',
            error: error.message
        });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;

        const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon updated.',
            data: { coupon }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update coupon.',
            error: error.message
        });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Coupon deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete coupon.',
            error: error.message
        });
    }
};
