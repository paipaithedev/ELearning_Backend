const express = require('express');
const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const categoryValidation = require('../validations/category');

const router = express.Router();

router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategoryById);
router.post(
    '/',
    auth,
    role('admin'),
    validate({ body: categoryValidation.createCategoryBody }),
    categoryController.createCategory
);
router.patch(
    '/:id',
    auth,
    role('admin'),
    validate({ body: categoryValidation.updateCategoryBody }),
    categoryController.updateCategory
);
router.delete('/:id', auth, role('admin'), categoryController.deleteCategory);
router.get('/:id/children', categoryController.listChildren);
router.post(
    '/:id/children',
    auth,
    role('admin'),
    validate({ body: categoryValidation.createCategoryBody }),
    categoryController.createChild
);

module.exports = router;
