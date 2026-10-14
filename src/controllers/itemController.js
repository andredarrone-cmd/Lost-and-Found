const itemModel = require('../models/itemModel');
const { uploadImage, deleteImage, PROOF_BUCKET } = require('../utils/storage');

async function listItems(req, res) {
  try {
    const items = await itemModel.searchFoundItems({
      keyword: req.query.keyword || '',
      category: req.query.category || '',
      status: req.query.status || 'found'
    });
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load inventory.' });
  }
}

async function categories(req, res) {
  try {
    res.json({ categories: await itemModel.getCategories() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load categories.' });
  }
}

async function getItem(req, res) {
  try {
    const item = await itemModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load item.' });
  }
}

async function reportLost(req, res) {
  let uploaded = null;
  try {
    const { item_name, description, category, last_seen_location, date_lost, contact_info } = req.body;
    if (!item_name || !description || !category || !last_seen_location || !date_lost || !contact_info) {
      return res.status(400).json({ message: 'Please complete all required fields.' });
    }

    if (req.file) uploaded = await uploadImage(req.file, `lost-reports/${req.session.user.id}`);

    const report = await itemModel.createLostReport({
      user_id: req.session.user.id,
      item_name: item_name.trim(),
      description: description.trim(),
      category: category.trim(),
      last_seen_location: last_seen_location.trim(),
      date_lost,
      contact_info: contact_info.trim(),
      image_path: uploaded?.url || null
    });

    res.status(201).json({ message: 'Lost item report submitted successfully.', report });
  } catch (err) {
    if (uploaded?.url) await deleteImage(uploaded.url);
    console.error(err);
    res.status(500).json({ message: 'Could not submit lost report.' });
  }
}

async function myLostReports(req, res) {
  try {
    res.json({ reports: await itemModel.getLostReportsByUser(req.session.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load your reports.' });
  }
}

async function claimItem(req, res) {
  let uploaded = null;
  try {
    const { message } = req.body;
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide at least 10 characters describing proof of ownership.' });
    }
    if (!req.file) return res.status(400).json({ message: 'Please upload a proof image.' });

    const item = await itemModel.findById(req.params.id);
    if (!item || item.status !== 'found') {
      return res.status(400).json({ message: 'This item is not currently available for claiming.' });
    }

    uploaded = await uploadImage(req.file, `claim-proofs/${req.session.user.id}`, PROOF_BUCKET);
    await itemModel.createClaim({
      item_id: item.id,
      user_id: req.session.user.id,
      message: message.trim(),
      proof_image_path: uploaded.path
    });

    res.status(201).json({ message: 'Claim submitted with proof image. Staff will review it.' });
  } catch (err) {
    if (uploaded?.path) await deleteImage(uploaded.path, PROOF_BUCKET);
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not submit claim.' });
  }
}

async function reportFound(req, res) {
  try {
    const { location_found, date_found } = req.body;
    if (!location_found || !date_found) {
      return res.status(400).json({ message: 'Please provide the location and date found.' });
    }

    const item = await itemModel.reportItemFoundByUser(req.params.id, {
      location_found: location_found.trim(),
      date_found,
      user_id: req.session.user.id
    });

    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ message: 'Thank you. The lost item is now marked as Found.', item });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not report the item as found.' });
  }
}

async function notifications(req, res) {
  try {
    res.json({ notifications: await itemModel.getNotifications(req.session.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load notifications.' });
  }
}

module.exports = { listItems, categories, getItem, reportLost, myLostReports, claimItem, reportFound, notifications };
