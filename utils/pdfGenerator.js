const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const QRCode = require('qrcode');

class CertificateGenerator {
  constructor() {
    this.qrSize = 120;
    this.margin = 40;
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
      // Resize QR code to desired size
      const qrImageBuffer = await sharp(qrCodeBuffer)
        .resize(this.qrSize, this.qrSize)
        .png()
        .toBuffer();

      // Create a white background with QR code using Sharp
      const overlayWidth = 200;
      const overlayHeight = 120;
      
      // Create white background
      const background = await sharp({
        create: {
          width: overlayWidth,
          height: overlayHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.9 }
        }
      })
      .png()
      .toBuffer();

      // Composite QR code onto background
      const overlayWithQR = await sharp(background)
        .composite([{
          input: qrImageBuffer,
          top: 10,
          left: 10
        }])
        .png()
        .toBuffer();

      console.log('✅ Overlay elements created');
      return {
        overlayImage: overlayWithQR,
        uid: uid.slice(0, 8) // Short UID for display
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

      // Embed overlay image
      const overlayImage = await pdfDoc.embedPng(overlayData.overlayImage);
      
      // Position overlay (top-right corner with margin)
      const overlayWidth = 180;
      const overlayHeight = 110;
      
      let x, y;
      if (format === 'portrait') {
        x = width - overlayWidth - this.margin;
        y = height - overlayHeight - this.margin;
      } else {
        x = width - overlayWidth - this.margin;
        y = height - overlayHeight - this.margin;
      }

      // Draw semi-transparent white background for better visibility
      firstPage.drawRectangle({
        x: x - 10,
        y: y - 10,
        width: overlayWidth + 20,
        height: overlayHeight + 20,
        color: rgb(1, 1, 1),
        opacity: 0.9,
      });

      // Draw overlay image (QR code)
      firstPage.drawImage(overlayImage, {
        x,
        y,
        width: overlayWidth,
        height: overlayHeight,
      });

      // Add UID text below the QR code
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      firstPage.drawText(`ID: ${overlayData.uid}`, {
        x: x,
        y: y - 25,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });

      console.log('✅ Overlay added to PDF');
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