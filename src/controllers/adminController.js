const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const { uploadImage, deleteImage } = require('../utils/storage');

async function stats(req, res) {
  try {
    res.json(await itemModel.getDashboardStats());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load dashboard statistics.' });
  }
}

async function createItem(req, res) {
  let uploaded = null;
  try {
    const { item_name, description, category, location_found, date_found } = req.body;
    if (!item_name || !description || !category || !location_found || !date_found) {
      return res.status(400).json({ message: 'Please complete all required item fields.' });
    }
    if (req.file) uploaded = await uploadImage(req.file, `found-items/${req.session.user.id}`);
    const item = await itemModel.createFoundItem({
      item_name: item_name.trim(),
      description: description.trim(),
      category: category.trim(),
      location_found: location_found.trim(),
      date_found,
      image_path: uploaded?.url || null,
      found_by: req.session.user.id
    });
    res.status(201).json({ item });
  } catch (err) {
    if (uploaded?.url) await deleteImage(uploaded.url);
    console.error(err);
    res.status(500).json({ message: 'Could not create found item.' });
  }
}

async function updateItem(req, res) {
  let uploaded = null;
  try {
    const { item_name, description, category, location_found, date_found, status } = req.body;
    if (!item_name || !description || !category || !location_found || !date_found || !status) {
      return res.status(400).json({ message: 'Please complete all item fields.' });
    }
    if (!['found', 'claimed', 'unfound'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const existing = await itemModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Item not found.' });

    if (req.file) uploaded = await uploadImage(req.file, `found-items/${req.session.user.id}`);
    const item = await itemModel.updateFoundItem(req.params.id, {
      item_name: item_name.trim(),
      description: description.trim(),
      category: category.trim(),
      location_found: location_found.trim(),
      date_found,
      status,
      image_path: uploaded?.url || null
    });

    if (uploaded?.url && existing.image_path) await deleteImage(existing.image_path);
    res.json({ item, message: 'Item updated.' });
  } catch (err) {
    if (uploaded?.url) await deleteImage(uploaded.url);
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not update item.' });
  }
}

async function updateItemStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['found', 'claimed', 'unfound'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const item = await itemModel.updateFoundItemStatus(req.params.id, status);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ item, message: `Item marked as ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not update item status.' });
  }
}

async function markItemFound(req, res) {
  try {
    const item = await itemModel.markItemFound(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ item, message: 'Lost item marked as found.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not mark item as found.' });
  }
}

async function deleteItem(req, res) {
  try {
    const imagePath = await itemModel.deleteFoundItem(req.params.id);
    if (imagePath) await deleteImage(imagePath);
    res.json({ message: 'Item deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete item.' });
  }
}

async function lostReports(req, res) {
  try {
    res.json({ reports: await itemModel.getLostReportsForAdmin(req.query.status || 'open') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load lost reports.' });
  }
}

async function reviewLostReport(req, res) {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid lost-report decision.' });
    }

    const result = await itemModel.reviewLostReport(req.params.id, status, req.session.user.id);
    if (result?.deleted_image_path) await deleteImage(result.deleted_image_path);

    res.json({
      message: status === 'approved'
        ? 'Lost report approved and posted to Manage Items.'
        : 'Lost report rejected and deleted.'
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not review lost report.' });
  }
}

async function claims(req, res) {
  try {
    res.json({ claims: await itemModel.getClaimsForAdmin(req.query.status || 'all') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load claims.' });
  }
}

async function reviewClaim(req, res) {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid claim status.' });
    }
    await itemModel.updateClaim(req.params.id, status, req.session.user.id);
    res.json({ message: `Claim ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not review claim.' });
  }
}

async function markItemUnfound(req, res) {
  try {
    await itemModel.markItemUnfound(req.params.id);
    res.json({ message: 'Item marked as unfound.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update item status.' });
  }
}

async function users(req, res) {
  try {
    res.json({ users: await userModel.getAllUsers() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load users.' });
  }
}

async function changeUserRole(req, res) {
  try {
    if (!['admin', 'staff', 'student'].includes(req.body.role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (Number(req.params.id) === Number(req.session.user.id) && req.body.role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    }
    const user = await userModel.updateRole(req.params.id, req.body.role);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update user role.' });
  }
}

async function changeUserStatus(req, res) {
  try {
    if (!['active', 'inactive'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    if (Number(req.params.id) === Number(req.session.user.id) && req.body.status !== 'active') {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }
    const user = await userModel.updateStatus(req.params.id, req.body.status);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update user status.' });
  }
}

module.exports = {
  stats,
  createItem,
  updateItem,
  updateItemStatus,
  deleteItem,
  lostReports,
  reviewLostReport,
  claims,
  reviewClaim,
  markItemUnfound,
  markItemFound,
  users,
  changeUserRole,
  changeUserStatus
};
