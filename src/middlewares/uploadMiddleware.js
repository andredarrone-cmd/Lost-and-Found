const multer = require('multer');

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

module.exports = upload;
