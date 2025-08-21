const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const QRCode = require('qrcode');

class CertificateGenerator {
  constructor() {
    this.qrSize = 80;
  }

  async generateQRCode(text) {
    try {
      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.toBuffer(text, {
        width: this.qrSize,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        type: 'png'
      });
      
      console.log('✅ QR code generated successfully');
      return qrBuffer;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  async createOverlayElements(qrCodeBuffer, uid, format = 'landscape') {
    try {
      // Just resize the QR code - no white background needed
      const qrImageBuffer = await sharp(qrCodeBuffer)
        .resize(this.qrSize, this.qrSize)
        .png()
        .toBuffer();

      console.log('✅ Overlay elements created');
      return {
        overlayImage: qrImageBuffer,
        uid: uid.slice(0, 20)
      };
    } catch (error) {
      throw new Error(`Failed to create overlay elements: ${error.message}`);
    }
  }

  async processImageToPdf(inputBuffer, inputMimeType, format = 'landscape') {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Determine page dimensions (A4 in points: 1 point = 1/72 inch)
      const pageWidth = format === 'portrait' ? 595 : 842;
      const pageHeight = format === 'portrait' ? 842 : 595;
      
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Process and resize image to fit page
      const maxWidth = pageWidth - 40; // 20pt margin on each side
      const maxHeight = pageHeight - 40;
      
      // Determine the best output format for PDF-lib
      let processedImageBuffer;
      let embedFunction;
      
      if (inputMimeType.includes('jpeg') || inputMimeType.includes('jpg')) {
        // Keep as JPEG for better compression
        processedImageBuffer = await sharp(inputBuffer)
          .resize(Math.floor(maxWidth), Math.floor(maxHeight), {
            fit: 'inside',
            withoutEnlargement: false
          })
          .jpeg({ quality: 90 })
          .toBuffer();
        embedFunction = pdfDoc.embedJpg.bind(pdfDoc);
      } else {
        // Convert to PNG for transparency support
        processedImageBuffer = await sharp(inputBuffer)
          .resize(Math.floor(maxWidth), Math.floor(maxHeight), {
            fit: 'inside',
            withoutEnlargement: false
          })
          .png()
          .toBuffer();
        embedFunction = pdfDoc.embedPng.bind(pdfDoc);
      }

      // Embed image in PDF
      const image = await embedFunction(processedImageBuffer);
      const imageDims = image.scale(1);

      // Center the image on the page
      const x = (pageWidth - imageDims.width) / 2;
      const y = (pageHeight - imageDims.height) / 2;

      page.drawImage(image, {
        x,
        y,
        width: imageDims.width,
        height: imageDims.height,
      });

      console.log('✅ Image processed and embedded in PDF');
      return pdfDoc;
    } catch (error) {
      throw new Error(`Failed to process image to PDF: ${error.message}`);
    }
  }

  async addOverlayToPdf(pdfDoc, overlayData, format = 'landscape') {
    try {
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Embed QR code image
      const qrImage = await pdfDoc.embedPng(overlayData.overlayImage);
      
      // Format-dependent positioning
      const qrSize = this.qrSize;
      let x, y, marginRight, marginBottom;
      
      if (format === 'portrait') {
        // Portrait: smaller margins, positioned more towards center
        marginRight = 60;
        marginBottom = 80;
        x = width - qrSize - marginRight;
        y = marginBottom;
      } else {
        // Landscape: larger margins, positioned in corner
        marginRight = 100;
        marginBottom = 60;
        x = width - qrSize - marginRight;
        y = marginBottom;
      }

      // Draw QR code (no background rectangle)
      firstPage.drawImage(qrImage, {
        x,
        y,
        width: qrSize,
        height: qrSize,
      });

      // Add UID text below the QR code with white color
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const uidText = `ID: ${overlayData.uid}`;
      
      // Calculate text position to center it under the QR code
      const textWidth = font.widthOfTextAtSize(uidText, 8);
      const textX = x + (qrSize - textWidth) / 2; // Center text under QR code
      const textY = y - 15; // 15px below QR code

      firstPage.drawText(uidText, {
        x: textX,
        y: textY,
        size: 8,
        font,
        color: rgb(1, 1, 1), // White color (RGB: 1, 1, 1)
      });

      console.log(`✅ Overlay added to PDF (${format} format: QR at ${x},${y})`);
      return pdfDoc;
    } catch (error) {
      throw new Error(`Failed to add overlay to PDF: ${error.message}`);
    }
  }

  async generateCertificate(inputFile, uid, verifyUrl, format = 'landscape') {
    try {
      console.log('🎨 Starting certificate generation with PDF-lib...');
      
      // Read input file
      const inputBuffer = await fs.readFile(inputFile.path);
      
      let pdfDoc;

      // Check if input is already a PDF
      if (inputFile.mimetype === 'application/pdf') {
        // Load existing PDF
        pdfDoc = await PDFDocument.load(inputBuffer);
        console.log('📄 Loaded existing PDF');
      } else {
        // Convert image to PDF
        pdfDoc = await this.processImageToPdf(inputBuffer, inputFile.mimetype, format);
        console.log('🖼️ Converted image to PDF');
      }

      // Generate QR code
      const qrCodeBuffer = await this.generateQRCode(verifyUrl);
      console.log('🔲 Generated QR code');

      // Create overlay elements
      const overlayData = await this.createOverlayElements(qrCodeBuffer, uid, format);
      console.log('🎯 Created overlay elements');

      // Add overlay to PDF
      await this.addOverlayToPdf(pdfDoc, overlayData, format);
      console.log('✅ Added overlay to PDF');

      // Return PDF bytes
      const pdfBytes = await pdfDoc.save();
      console.log('🎉 Certificate generation completed successfully');
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('❌ Certificate generation failed:', error);
      throw new Error(`Certificate generation failed: ${error.message}`);
    }
  }
}

module.exports = CertificateGenerator;