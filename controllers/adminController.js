const getAdminForm = (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
<title>Generate Certificate with QR Code</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 5px; font-weight: bold; }
  input[type="file"] { width: 100%; padding: 10px; border: 2px dashed #ccc; }
  input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
  button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
  button:hover { background: #0056b3; }
  .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
</style>
<div class="info">
  <h2>Upload Certificate & Add QR Code</h2>
  <p>Upload your certificate image/PDF and we'll add a QR code and unique ID for verification.</p>
</div>
<form method="POST" action="/certs" enctype="multipart/form-data">
  <div class="form-group">
    <label>Certificate File (PNG, JPG, PDF)</label>
    <input type="file" name="certificate" accept=".png,.jpg,.jpeg,.pdf" required>
  </div>
  <div class="form-group">
    <label>Description (optional)</label>
    <input type="text" name="description" placeholder="e.g., Java Bootcamp Certificate">
  </div>
  <button type="submit">Generate Certificate with QR Code</button>
</form>`);
};

module.exports = {
  getAdminForm
};
