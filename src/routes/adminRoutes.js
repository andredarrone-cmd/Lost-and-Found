const router = require('express').Router();
const controller = require('../controllers/adminController');
const { requireRoles } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(requireRoles('admin', 'staff'));
router.get('/stats', controller.stats);
router.post('/items', upload.single('image'), controller.createItem);
router.put('/items/:id', upload.single('image'), controller.updateItem);
router.patch('/items/:id', controller.updateItemStatus);
router.delete('/items/:id', controller.deleteItem);
router.get('/lost-reports', controller.lostReports);
router.patch('/lost-reports/:id/review', controller.reviewLostReport);
router.get('/claims', controller.claims);
router.patch('/claims/:id', controller.reviewClaim);
router.patch('/items/:id/mark-found', controller.markItemFound);
router.patch('/items/:id/unfound', controller.markItemUnfound);
router.get('/users', requireRoles('admin'), controller.users);
router.patch('/users/:id/role', requireRoles('admin'), controller.changeUserRole);
router.patch('/users/:id/status', requireRoles('admin'), controller.changeUserStatus);

module.exports = router;
