const getAdminForm = (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
<title>Generate Certificate with QR Code</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
  input[type="file"] { width: 100%; padding: 12px; border: 2px dashed #007bff; border-radius: 6px; background: #f8f9fa; }
  input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
  .radio-group { display: flex; gap: 20px; margin-top: 8px; }
  .radio-option { display: flex; align-items: center; gap: 8px; }
  input[type="radio"] { margin: 0; }
  .radio-option label { margin: 0; font-weight: normal; }
  button { background: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
  button:hover { background: #0056b3; }
  .info { background: #e7f3ff; border-left: 4px solid #007bff; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
  .form-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .form-section h3 { margin-top: 0; color: #495057; }
</style>
<div class="info">
  <h2>Certificate Generator with QR Code</h2>
  <p>Fill out the details below and upload your certificate to add a verification QR code.</p>
</div>

<form method="POST" action="/certs" enctype="multipart/form-data">
  <div class="form-section">
    <h3>Certificate Details</h3>
    
    <div class="form-group">
      <label>Bootcamp Name</label>
      <input type="text" name="bootcamp" placeholder="Bootcamp name" required>
    </div>
    
    <div class="form-group">
      <label>Certificate Format</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="portrait" name="format" value="portrait" required>
          <label for="portrait">Portrait</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="landscape" name="format" value="landscape" required>
          <label for="landscape">Landscape</label>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label>Certificate Type</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="completion" name="type" value="completion" required>
          <label for="completion">Completion</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="participation" name="type" value="participation" required>
          <label for="participation">Participation</label>
        </div>
      </div>
    </div>
  </div>

  <div class="form-section">
    <h3>Upload Certificate</h3>
    
    <div class="form-group">
      <label>Certificate File (PNG, JPG, PDF)</label>
      <input type="file" name="certificate" accept=".png,.jpg,.jpeg,.pdf" required>
    </div>
    
    <div class="form-group">
      <label>Description (optional)</label>
      <input type="text" name="description" placeholder="Additional description">
    </div>
  </div>
  
  <button type="submit">Generate Certificate with QR Code</button>
</form>`);
};

module.exports = {
  getAdminForm
};
