const Category = require('../schema/Category');

const makeSlug = (text) => {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const ensureUniqueSlug = async (baseSlug, excludeId) => {
    let slug = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const existing = await Category.findOne({ slug });
        if (!existing || String(existing._id) === String(excludeId)) {
            break;
        }
        counter += 1;
        slug = `${baseSlug}-${counter}`;
    }

    return slug;
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, icon, parentId, isActive } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required.' });
        }

        const baseSlug = makeSlug(name);
        if (!baseSlug) {
            return res.status(400).json({ success: false, message: 'Invalid name.' });
        }

        const slug = await ensureUniqueSlug(baseSlug);

        const category = await Category.create({
            name,
            slug,
            description,
            icon,
            parentId: parentId || null,
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        return res.status(201).json({
            success: true,
            message: 'Category created.',
            data: { category }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create category.',
            error: error.message
        });
    }
};

exports.listCategories = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const query = {};
        
        // Search filter
        if (req.query.q) {
            const searchRegex = new RegExp(req.query.q, 'i');
            query.$or = [
                { name: searchRegex },
                { slug: searchRegex }
            ];
        }

        // Parent filter (supports 'null' string or actual ID)
        if (req.query.parentId !== undefined) {
            query.parentId = req.query.parentId === 'null' ? null : req.query.parentId;
        }

        const [categories, total] = await Promise.all([
            Category.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Category.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Categories fetched.',
            data: {
                categories,
                count: categories.length,
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch categories.',
            error: error.message
        });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Category fetched.',
            data: { category }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch category.',
            error: error.message
        });
    }
};

exports.listChildren = async (req, res) => {
    try {
        const parentId = req.params.id;
        const children = await Category.find({ parentId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Child categories fetched.',
            data: { categories: children, count: children.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch child categories.',
            error: error.message
        });
    }
};

exports.createChild = async (req, res) => {
    try {
        const parentId = req.params.id;
        const { name, description, icon, isActive } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required.' });
        }

        const parent = await Category.findById(parentId);
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent category not found.' });
        }

        const baseSlug = makeSlug(name);
        if (!baseSlug) {
            return res.status(400).json({ success: false, message: 'Invalid name.' });
        }

        const slug = await ensureUniqueSlug(baseSlug);

        const category = await Category.create({
            name,
            slug,
            description,
            icon,
            parentId,
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        return res.status(201).json({
            success: true,
            message: 'Child category created.',
            data: { category }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create child category.',
            error: error.message
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        const { name, description, icon, parentId, isActive } = req.body;

        if (name !== undefined) {
            const baseSlug = makeSlug(name);
            if (!baseSlug) {
                return res.status(400).json({ success: false, message: 'Invalid name.' });
            }
            category.name = name;
            category.slug = await ensureUniqueSlug(baseSlug, category._id);
        }

        if (description !== undefined) category.description = description;
        if (icon !== undefined) category.icon = icon;
        if (parentId !== undefined) category.parentId = parentId || null;
        if (isActive !== undefined) category.isActive = Boolean(isActive);

        await category.save();

        return res.status(200).json({
            success: true,
            message: 'Category updated.',
            data: { category }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update category.',
            error: error.message
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        await Category.findByIdAndDelete(category._id);

        return res.status(200).json({
            success: true,
            message: 'Category deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete category.',
            error: error.message
        });
    }
};
