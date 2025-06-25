// XoptYmiZ Chrome Extension - Popup Script
document.addEventListener('DOMContentLoaded', function() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');
  const fullAnalysisBtn = document.getElementById('fullAnalysisBtn');

  // Hide all sections initially
  loading.style.display = 'none';
  results.style.display = 'none';
  error.style.display = 'none';

  // Analyze button click handler
  analyzeBtn.addEventListener('click', async function() {
    try {
      // Show loading state
      analyzeBtn.style.display = 'none';
      loading.style.display = 'block';
      results.style.display = 'none';
      error.style.display = 'none';

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject content script to analyze page
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: analyzePage
      });

      // Simulate processing time for better UX
      setTimeout(() => {
        if (result && result.result) {
          displayResults(result.result, tab.url);
        } else {
          showError();
        }
      }, 2000);

    } catch (err) {
      console.error('Analysis failed:', err);
      showError();
    }
  });

  // Function to inject into page for analysis
  function analyzePage() {
    try {
      // Extract page content
      const title = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent.trim())
        .filter(text => text.length > 0);
      
      // Get main content (try different selectors)
      const contentSelectors = [
        'main', 
        'article', 
        '.content', 
        '.post-content', 
        '.entry-content',
        '#content',
        'body'
      ];
      
      let mainContent = '';
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainContent = element.textContent || '';
          break;
        }
      }

      // Basic text analysis
      const text = `${title} ${metaDescription} ${headings.join(' ')} ${mainContent}`;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;

      // Simple entity extraction (keywords that appear frequently)
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const wordFreq = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      // Get top entities (exclude common words)
      const commonWords = new Set([
        'that', 'this', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 
        'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come',
        'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take',
        'than', 'them', 'well', 'were', 'more', 'your', 'only', 'other', 'into',
        'also', 'back', 'after', 'first', 'work', 'life', 'which', 'their',
        'said', 'each', 'most', 'need', 'help', 'through', 'find', 'where',
        'being', 'both', 'down', 'even', 'going', 'home', 'last', 'made',
        'might', 'never', 'right', 'still', 'these', 'think', 'under',
        'while', 'would', 'years'
      ]);

      const entities = Object.entries(wordFreq)
        .filter(([word, freq]) => !commonWords.has(word) && freq > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);

      // Calculate basic AI readability score
      let score = 50; // Base score

      // Factors that improve AI readability
      if (title.length > 10 && title.length < 60) score += 10;
      if (metaDescription.length > 50 && metaDescription.length < 160) score += 10;
      if (headings.length >= 3) score += 15;
      if (wordCount > 300) score += 10;
      if (entities.length >= 5) score += 15;
      
      // Check for semantic elements
      const hasStructuredData = !!document.querySelector('script[type="application/ld+json"]');
      if (hasStructuredData) score += 20;
      
      const hasSemanticHTML = document.querySelectorAll('article, section, header, nav, aside, footer').length > 0;
      if (hasSemanticHTML) score += 10;

      // Penalties
      if (wordCount < 100) score -= 20;
      if (title.length < 10) score -= 15;
      if (entities.length < 3) score -= 10;

      // Ensure score is within bounds
      score = Math.max(0, Math.min(100, score));

      return {
        score: score,
        title: title,
        wordCount: wordCount,
        entities: entities.slice(0, 5),
        headingCount: headings.length,
        hasStructuredData: hasStructuredData,
        quality: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
        recommendations: generateRecommendations(score, title, metaDescription, headings, entities, hasStructuredData)
      };

    } catch (error) {
      console.error('Page analysis error:', error);
      return null;
    }
  }

  // Generate recommendations based on analysis
  function generateRecommendations(score, title, metaDescription, headings, entities, hasStructuredData) {
    const recs = [];
    
    if (score < 60) {
      recs.push('Improve overall content structure');
    }
    if (title.length < 10 || title.length > 60) {
      recs.push('Optimize title length (10-60 characters)');
    }
    if (metaDescription.length < 50) {
      recs.push('Add compelling meta description');
    }
    if (headings.length < 3) {
      recs.push('Add more heading structure (H1-H6)');
    }
    if (entities.length < 5) {
      recs.push('Include more topical entities');
    }
    if (!hasStructuredData) {
      recs.push('Add structured data markup');
    }
    
    // Default recommendations if specific issues not found
    if (recs.length === 0) {
      recs.push('Add more entity relationships');
      recs.push('Enhance semantic markup');
      recs.push('Optimize for AI understanding');
    }
    
    return recs.slice(0, 3); // Max 3 recommendations
  }

  // Display analysis results
  function displayResults(data, url) {
    loading.style.display = 'none';
    results.style.display = 'block';

    // Update score circle
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreText = document.getElementById('scoreText');
    const angle = (data.score / 100) * 360;
    
    scoreCircle.style.setProperty('--score-angle', `${angle}deg`);
    scoreText.textContent = data.score;

    // Update score color based on value
    let scoreColor = '#ef4444'; // Red
    if (data.score >= 80) scoreColor = '#10b981'; // Green
    else if (data.score >= 60) scoreColor = '#f59e0b'; // Yellow
    
    scoreCircle.style.background = `conic-gradient(from 0deg, ${scoreColor} 0deg, ${scoreColor} ${angle}deg, rgba(255,255,255,0.2) ${angle}deg)`;

    // Update metrics
    document.getElementById('qualityScore').textContent = data.quality;
    document.getElementById('entityCount').textContent = data.entities.length;
    document.getElementById('relationshipCount').textContent = Math.floor(data.entities.length * 1.8); // Simulated

    // Update entities
    const entityTags = document.getElementById('entityTags');
    entityTags.innerHTML = '';
    data.entities.slice(0, 3).forEach(entity => {
      const tag = document.createElement('span');
      tag.className = 'entity-tag';
      tag.textContent = entity.charAt(0).toUpperCase() + entity.slice(1);
      entityTags.appendChild(tag);
    });

    // Update recommendations
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = '';
    data.recommendations.forEach(rec => {
      const recDiv = document.createElement('div');
      recDiv.className = 'rec-item';
      recDiv.textContent = rec;
      recommendationsDiv.appendChild(recDiv);
    });

    // Update CTA button
    const encodedUrl = encodeURIComponent(url);
    fullAnalysisBtn.href = `https://xoptymiz.com/demo?url=${encodedUrl}&score=${data.score}`;

    // Show analyze button again
    analyzeBtn.style.display = 'block';
    analyzeBtn.textContent = '🔄 Analyze Again';
  }

  // Show error state
  function showError() {
    loading.style.display = 'none';
    error.style.display = 'block';
    analyzeBtn.style.display = 'block';
  }

  // Track usage (for analytics)
  function trackEvent(eventName, data = {}) {
    // Send to your analytics endpoint
    // fetch('https://your-analytics-endpoint.com/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event: eventName, data: data })
    // });
    console.log('Event tracked:', eventName, data);
  }

  // Track popup opened
  trackEvent('popup_opened');
});