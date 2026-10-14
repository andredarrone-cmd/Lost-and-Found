const router = require('express').Router();
const controller = require('../controllers/itemController');
const { requireAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', controller.listItems);
router.get('/categories', controller.categories);
router.get('/notifications', requireAuth, controller.notifications);
router.get('/lost-reports', requireAuth, controller.myLostReports);
router.post('/lost-reports', requireAuth, upload.single('image'), controller.reportLost);
router.get('/:id', controller.getItem);
router.post('/:id/report-found', requireAuth, controller.reportFound);
router.post('/:id/claim', requireAuth, upload.single('proof_image'), controller.claimItem);

module.exports = router;
