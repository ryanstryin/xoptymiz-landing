// XoptYmiZ Chrome Extension - Content Script
// This script runs on every webpage and provides additional functionality

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.xoptymizExtensionLoaded) {
    return;
  }
  window.xoptymizExtensionLoaded = true;

  // Add subtle indicator that XoptYmiZ can analyze this page
  function addPageIndicator() {
    // Only add indicator on pages with substantial content
    const mainContent = document.querySelector('main, article, .content, .post-content, .entry-content');
    const wordCount = document.body.textContent.split(/\s+/).length;
    
    if (wordCount < 100) return; // Skip pages with minimal content

    // Create floating indicator
    const indicator = document.createElement('div');
    indicator.id = 'xoptymiz-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0.9;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.opacity='1';" 
         onmouseout="this.style.transform='translateY(0px)'; this.style.opacity='0.9';"
         onclick="this.style.display='none';">
        🧠 Analyze with XoptYmiZ
      </div>
    `;

    document.body.appendChild(indicator);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 5000);

    // Click handler to open extension popup
    indicator.addEventListener('click', function() {
      // Send message to background script to open popup
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });
  }

  // Simple content analysis for quick insights
  function getQuickAnalysis() {
    const title = document.title || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).length;
    const wordCount = document.body.textContent.split(/\s+/).filter(w => w.length > 0).length;
    const hasStructuredData = !!document.querySelector('script[type="application/ld+json"]');
    
    return {
      title: title,
      headings: headings,
      wordCount: wordCount,
      hasStructuredData: hasStructuredData,
      url: window.location.href
    };
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getQuickAnalysis') {
      sendResponse(getQuickAnalysis());
    }
    
    if (request.action === 'highlightIssues') {
      highlightContentIssues();
      sendResponse({ success: true });
    }
  });

  // Highlight potential content issues on the page
  function highlightContentIssues() {
    // Remove existing highlights
    document.querySelectorAll('.xoptymiz-highlight').forEach(el => {
      el.classList.remove('xoptymiz-highlight');
      el.style.removeProperty('outline');
      el.style.removeProperty('background');
    });

    // Add highlight style
    const style = document.createElement('style');
    style.textContent = `
      .xoptymiz-highlight {
        outline: 2px dashed #667eea !important;
        background: rgba(102, 126, 234, 0.1) !important;
        position: relative;
      }
      .xoptymiz-highlight::after {
        content: '⚠️ Needs AI optimization';
        position: absolute;
        top: -25px;
        left: 0;
        background: #667eea;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
        z-index: 1000;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);

    // Highlight images without alt text
    document.querySelectorAll('img:not([alt]), img[alt=""]').forEach(img => {
      img.classList.add('xoptymiz-highlight');
    });

    // Highlight headings that might be too long or empty
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      if (heading.textContent.length > 60 || heading.textContent.trim().length < 3) {
        heading.classList.add('xoptymiz-highlight');
      }
    });

    // Auto-remove highlights after 10 seconds
    setTimeout(() => {
      document.querySelectorAll('.xoptymiz-highlight').forEach(el => {
        el.classList.remove('xoptymiz-highlight');
        el.style.removeProperty('outline');
        el.style.removeProperty('background');
      });
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 10000);
  }

  // Initialize when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(addPageIndicator, 2000); // Wait 2 seconds after page load
    });
  } else {
    setTimeout(addPageIndicator, 2000);
  }

  // Track page view for analytics
  function trackPageView() {
    const analysis = getQuickAnalysis();
    // Send to your analytics endpoint
    // fetch('https://your-analytics-endpoint.com/pageview', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(analysis)
    // });
    console.log('Page analyzed:', analysis);
  }

  // Track page view after a delay
  setTimeout(trackPageView, 3000);

})();
    