const { loadDB } = require('../utils/database');
const { escapeHtml } = require('../utils/helpers');

const verifyCertificate = (req, res) => {
  const db = loadDB();
  const rec = db.find(r => r.uid === req.params.uid);
  
  if (!rec) {
    return res.status(404).send(`
      <!doctype html><meta charset="utf-8">
      <title>Certificate Not Found</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; }
      </style>
      <div class="error">
        <h1>❌ Certificate Not Found</h1>
        <p>The certificate with this ID could not be found or may have been removed.</p>
      </div>
    `);
  }
  
  res.send(`<!doctype html><meta charset="utf-8">
<title>Certificate Verification</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
  .verified { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
  .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .detail-row { margin-bottom: 10px; }
  .label { font-weight: bold; color: #495057; }
  .value { color: #212529; }
  .actions { text-align: center; }
  .actions a { display: inline-block; margin: 10px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
  .actions a:hover { background: #0056b3; }
  .uid { font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 3px; }
</style>
<div class="verified">
  <h1>✅ Certificate Verified</h1>
  <p>This certificate is authentic and has been verified.</p>
</div>
<div class="details">
  <div class="detail-row">
    <span class="label">Description:</span> 
    <span class="value">${escapeHtml(rec.description || 'N/A')}</span>
  </div>
  <div class="detail-row">
    <span class="label">Original Filename:</span> 
    <span class="value">${escapeHtml(rec.originalFilename || 'N/A')}</span>
  </div>
  <div class="detail-row">
    <span class="label">Created:</span> 
    <span class="value">${rec.createdAt ? new Date(rec.createdAt).toLocaleString() : 'N/A'}</span>
  </div>
  <div class="detail-row">
    <span class="label">Certificate ID:</span> 
    <span class="value uid">${rec.uid}</span>
  </div>
</div>
<div class="actions">
  <a href="${rec.file_url}" target="_blank">📄 View Certificate</a>
</div>`);
};

module.exports = {
  verifyCertificate
};
