const { getCertificateByUid } = require('../utils/supabaseDatabase');
const { escapeHtml } = require('../utils/helpers');
const templateRenderer = require('../utils/templateRenderer');

const verifyCertificate = async (req, res) => {
  try {
    const rec = await getCertificateByUid(req.params.uid);
  
    if (!rec) {
      const html = templateRenderer.renderAdvanced('verification', {
        title: 'Certificate Not Found',
        isValid: false
      }, ['common', 'verification']);
      
      return res.status(404).send(html);
    }

    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Certificate Verification',
      isValid: true,
      bootcamp: escapeHtml(rec.bootcamp || 'N/A'),
      type: escapeHtml(rec.type || 'N/A'),
      studentName: escapeHtml(rec.student_name || 'N/A'),
      createdAt: rec.created_at ? new Date(rec.created_at).toLocaleString() : 'N/A',
      uid: rec.uid,
      fileUrl: rec.file_url
    }, ['common', 'verification']);
    
    res.send(html);
  } catch (error) {
    console.error('Verification error:', error);
    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Verification Error',
      isValid: false,
      error: true
    }, ['common', 'verification']);
    
    res.status(500).send(html);
  }
};

module.exports = {
  verifyCertificate
};
