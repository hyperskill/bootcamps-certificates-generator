const fs = require('fs');
const path = require('path');

class TemplateRenderer {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.htmlDir = path.join(this.templatesDir, 'html');
    this.cssDir = path.join(this.templatesDir, 'css');
    this.partialsDir = path.join(this.templatesDir, 'partials');
  }

  // Load and cache CSS files
  loadCSS(cssFile) {
    try {
      const cssPath = path.join(this.cssDir, `${cssFile}.css`);
      return fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
      console.error(`Error loading CSS file ${cssFile}:`, error);
      return '';
    }
  }

  // Load HTML template
  loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.htmlDir, `${templateName}.html`);
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      return '';
    }
  }

  // Load partial (reusable component)
  loadPartial(partialName) {
    try {
      const partialPath = path.join(this.partialsDir, `${partialName}.html`);
      return fs.readFileSync(partialPath, 'utf8');
    } catch (error) {
      console.error(`Error loading partial ${partialName}:`, error);
      return '';
    }
  }

  // Replace placeholders in template with data
  render(templateName, data = {}, cssFiles = []) {
    let template = this.loadTemplate(templateName);
    
    // Load and inject CSS
    let styles = '';
    cssFiles.forEach(cssFile => {
      styles += this.loadCSS(cssFile);
    });
    
    // Replace CSS placeholder
    template = template.replace('{{CSS}}', styles);
    
    // Replace data placeholders
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, data[key] || '');
    });

    // Handle partials
    const partialRegex = /{{>([\w-]+)}}/g;
    template = template.replace(partialRegex, (match, partialName) => {
      return this.loadPartial(partialName);
    });

    return template;
  }

  // Render with multiple CSS files and advanced data binding
  renderAdvanced(templateName, data = {}, cssFiles = []) {
    let template = this.loadTemplate(templateName);
    
    // Load and inject CSS
    let styles = '';
    cssFiles.forEach(cssFile => {
      styles += this.loadCSS(cssFile);
    });
    template = template.replace('{{CSS}}', styles);
    
    // Handle complex data binding (loops, conditionals)
    template = this.processConditionals(template, data);
    template = this.processLoops(template, data);
    
    // Replace simple placeholders
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, data[key] || '');
    });

    // Handle partials
    const partialRegex = /{{>([\w-]+)}}/g;
    template = template.replace(partialRegex, (match, partialName) => {
      return this.loadPartial(partialName);
    });

    return template;
  }

  // Process conditional statements {{#if condition}}...{{/if}}
  processConditionals(template, data) {
    // Handle nested conditionals by processing from innermost to outermost
    let processed = template;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (processed.includes('{{#if') && iterations < maxIterations) {
      const conditionalRegex = /{{#if\s+([\w.]+)}}((?:(?!{{#if)(?!{{\/if}})[\s\S])*?){{\/if}}/g;
      processed = processed.replace(conditionalRegex, (match, condition, content) => {
        // Handle dot notation like this.property
        const value = this.getNestedValue(data, condition);
        return value ? content : '';
      });
      iterations++;
    }
    
    return processed;
  }

  // Helper to get nested values like this.property
  getNestedValue(obj, path) {
    if (path.startsWith('this.')) {
      path = path.substring(5); // Remove 'this.'
    }
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : false;
    }, obj);
  }

  // Process loops {{#each items}}...{{/each}}
  processLoops(template, data) {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace {{this.property}} with item values
        Object.keys(item).forEach(key => {
          const placeholder = new RegExp(`{{this\\.${key}}}`, 'g');
          itemContent = itemContent.replace(placeholder, item[key] || '');
        });
        
        // Replace {{../property}} with parent data
        Object.keys(data).forEach(key => {
          const placeholder = new RegExp(`{{\\.\\./${key}}}`, 'g');
          itemContent = itemContent.replace(placeholder, data[key] || '');
        });
        
        // Support nested conditionals within loops
        itemContent = this.processConditionals(itemContent, {...item, ...data});
        
        return itemContent;
      }).join('');
    });
  }

  // Helper method to format certificate data for templates
  formatCertificatesData(certificates, showCreatedBy = false) {
    if (!certificates || certificates.length === 0) {
      return {
        isEmpty: true,
        emptyMessage: "No certificates yet. <a href='/admin'>Generate your first certificate!</a>"
      };
    }

    // Group certificates by bootcamp
    const groupedCerts = certificates.reduce((groups, cert) => {
      const bootcamp = cert.bootcamp || 'Unknown Bootcamp';
      if (!groups[bootcamp]) groups[bootcamp] = [];
      groups[bootcamp].push(cert);
      return groups;
    }, {});

    const bootcampGroups = Object.entries(groupedCerts).map(([bootcamp, certs]) => ({
      bootcamp,
      count: certs.length,
      isPlural: certs.length !== 1,
      showCreatedBy,
      certificates: certs.map(cert => ({
        studentName: cert.student_name || 'Unknown Student',
        type: cert.type,
        typeLabel: cert.type === 'completion' ? 'Completion' : 'Participation',
        formatLabel: cert.format === 'portrait' ? 'Portrait' : 'Landscape',
        createdBy: cert.profiles?.full_name || cert.profiles?.email || 'Unknown User',
        createdAt: new Date(cert.created_at).toLocaleDateString(),
        fileUrl: cert.file_url,
        verifyUrl: cert.verify_url
      }))
    }));

    return {
      isEmpty: false,
      bootcampGroups,
      showCreatedBy
    };
  }

  // Helper method to create alert HTML
  createAlert(type, message) {
    if (!message) return '';
    return `<div class="alert ${type}">${message}</div>`;
  }
}

module.exports = new TemplateRenderer();
