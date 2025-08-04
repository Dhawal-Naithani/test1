const express = require('express');
const router = express.Router();
const db = require('../db');
const {simulatePrice} = require('../utils/simulate');

// 📘 GET: all stocks with simulated price
router.get('/stocks', (req, res) => {
  db.query('SELECT * FROM stocks', (err, results) => {
    if (err) return res.status(500).send(err);
    const updated = results.map(stock => ({
      ...stock,
      price: simulatePrice(stock.price)
    }));
    res.json(updated);
  });
});

// 📘 GET: all mutual funds with simulated NAV
router.get('/mutual-funds', (req, res) => {
  db.query('SELECT * FROM mutual_funds', (err, results) => {
    if (err) return res.status(500).send(err);
    const updated = results.map(mf => ({
      ...mf,
      nav: simulatePrice(mf.nav)
    }));
    res.json(updated);
  });
});

// 📘 GET: current holdings
router.get('/holdings', (req, res) => {
  db.query('SELECT * FROM holdings', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// 📘 GET: all transactions
router.get('/transactions', (req, res) => {
  db.query('SELECT * FROM transactions ORDER BY timestamp DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// ✅ POST: Buy asset
router.post('/buy', (req, res) => {
  const { asset_type, asset_code, quantity, price } = req.body;
  const timestamp = new Date();

  const checkSQL = `SELECT * FROM holdings WHERE asset_code = ? AND asset_type = ?`;
  db.query(checkSQL, [asset_code, asset_type], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      // First-time buy
      const insertSQL = `
        INSERT INTO holdings (asset_type, asset_code, quantity, avg_price)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertSQL, [asset_type, asset_code, quantity, price], (err) => {
        if (err) return res.status(500).send(err);
      });
    } else {
      // Update existing holding
      const h = results[0];
      const newQty = parseFloat(h.quantity) + parseFloat(quantity);
      const newAvg = ((h.quantity * h.avg_price) + (quantity * price)) / newQty;

      const updateSQL = `UPDATE holdings SET quantity = ?, avg_price = ? WHERE id = ?`;
      db.query(updateSQL, [newQty, newAvg, h.id], (err) => {
        if (err) return res.status(500).send(err);
      });
    }

    // Add transaction
    const txnSQL = `
      INSERT INTO transactions (type, asset_type, asset_code, quantity, price, timestamp)
      VALUES ('buy', ?, ?, ?, ?, ?)
    `;
    db.query(txnSQL, [asset_type, asset_code, quantity, price, timestamp], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true, message: 'Buy order executed' });
    });
  });
});

// ✅ POST: Sell asset
router.post('/sell', (req, res) => {
  const { asset_type, asset_code, quantity, price } = req.body;
  const timestamp = new Date();

  const checkSQL = `SELECT * FROM holdings WHERE asset_code = ? AND asset_type = ?`;
  db.query(checkSQL, [asset_code, asset_type], (err, results) => {
    if (err || results.length === 0) return res.status(400).send("Asset not found in holdings");

    const holding = results[0];
    if (quantity > holding.quantity) {
      return res.status(400).send("Not enough quantity to sell");
    }

    const remainingQty = holding.quantity - quantity;

    if (remainingQty > 0) {
      const updateSQL = `UPDATE holdings SET quantity = ? WHERE id = ?`;
      db.query(updateSQL, [remainingQty, holding.id], (err) => {
        if (err) return res.status(500).send(err);
      });
    } else {
      const deleteSQL = `DELETE FROM holdings WHERE id = ?`;
      db.query(deleteSQL, [holding.id], (err) => {
        if (err) return res.status(500).send(err);
      });
    }

    const txnSQL = `
      INSERT INTO transactions (type, asset_type, asset_code, quantity, price, timestamp)
      VALUES ('sell', ?, ?, ?, ?, ?)
    `;
    db.query(txnSQL, [asset_type, asset_code, quantity, price, timestamp], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true, message: 'Sell order executed' });
    });
  });
});

module.exports = router;
