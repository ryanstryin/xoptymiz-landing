// XoptYmiZ Admin JavaScript - assets/js/admin.js

jQuery(document).ready(function($) {
    'use strict';
    
    // Initialize XoptYmiZ Admin
    const XoptYmiZAdmin = {
        
        // Initialize all functionality
        init: function() {
            this.bindEvents();
            this.initializeComponents();
            this.loadDashboardData();
        },
        
        // Bind event handlers
        bindEvents: function() {
            // Dashboard action buttons
            $('#generate-llms-txt').on('click', this.generateLLMsTxt);
            $('#sync-all-content').on('click', this.syncAllContent);
            $('#refresh-graph').on('click', this.refreshKnowledgeGraph);
            
            // Settings form validation
            $('form[action=""]').on('submit', this.validateSettings);
            
            // Meta box actions
            $('.xoptymiz-meta-box').on('click', '.button', this.handleMetaBoxAction);
            
            // Analytics refresh
            $('#refresh-analytics').on('click', this.refreshAnalytics);
            
            // Knowledge graph controls
            $('#graph-filter, #importance-slider').on('change', this.updateKnowledgeGraph);
            $('#importance-slider').on('input', this.updateImportanceDisplay);
        },
        
        // Initialize components
        initializeComponents: function() {
            // Initialize tooltips
            this.initTooltips();
            
            // Initialize progress bars
            this.initProgressBars();
            
            // Initialize charts if on analytics page
            if ($('.xoptymiz-analytics-dashboard').length > 0) {
                this.initializeCharts();
            }
            
            // Initialize knowledge graph if on that page
            if ($('#knowledge-graph-container').length > 0) {
                this.initializeKnowledgeGraph();
            }
        },
        
        // Load dashboard data
        loadDashboardData: function() {
            if ($('.xoptymiz-admin').length === 0) return;
            
            // Load recent activity
            this.loadRecentActivity();
            
            // Load optimization tips
            this.loadOptimizationTips();
            
            // Update stats periodically
            setInterval(() => {
                this.refreshStats();
            }, 60000); // Every minute
        },
        
        // Generate LLMs.txt
        generateLLMsTxt: function() {
            const button = $(this);
            const originalText = button.text();
            
            XoptYmiZAdmin.setButtonLoading(button, xoptymizAjax.strings.processing);
            
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_generate_llms_txt',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.showNotice('success', xoptymizAjax.strings.success + ' LLMs.txt generated successfully!');
                        
                        // Update stats
                        XoptYmiZAdmin.updateLLMsTxtStats(response.data);
                        
                        // Show download option
                        XoptYmiZAdmin.showLLMsTxtModal(response.data);
                    } else {
                        XoptYmiZAdmin.showNotice('error', 'Error: ' + response.data);
                    }
                },
                error: function() {
                    XoptYmiZAdmin.showNotice('error', xoptymizAjax.strings.error);
                },
                complete: function() {
                    XoptYmiZAdmin.setButtonLoading(button, originalText, false);
                }
            });
        },
        
        // Sync all content
        syncAllContent: function() {
            if (!confirm(xoptymizAjax.strings.confirm_sync)) {
                return;
            }
            
            const button = $(this);
            const originalText = button.text();
            
            XoptYmiZAdmin.setButtonLoading(button, xoptymizAjax.strings.processing);
            
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_sync_all_content',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.showNotice('success', 'Content sync started! Processing ' + response.data.total_posts + ' posts.');
                        
                        // Start progress tracking
                        XoptYmiZAdmin.trackSyncProgress(response.data.batch_id);
                    } else {
                        XoptYmiZAdmin.showNotice('error', 'Error: ' + response.data);
                    }
                },
                error: function() {
                    XoptYmiZAdmin.showNotice('error', xoptymizAjax.strings.error);
                },
                complete: function() {
                    XoptYmiZAdmin.setButtonLoading(button, originalText, false);
                }
            });
        },
        
        // Track sync progress
        trackSyncProgress: function(batchId) {
            const progressModal = this.createProgressModal();
            
            const checkProgress = () => {
                $.ajax({
                    url: xoptymizAjax.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'xoptymiz_get_sync_progress',
                        nonce: xoptymizAjax.nonce,
                        batch_id: batchId
                    },
                    success: function(response) {
                        if (response.success) {
                            const progress = response.data;
                            progressModal.updateProgress(progress.completed, progress.total);
                            
                            if (progress.completed >= progress.total) {
                                progressModal.complete();
                                XoptYmiZAdmin.refreshStats();
                            } else {
                                setTimeout(checkProgress, 2000);
                            }
                        }
                    }
                });
            };
            
            checkProgress();
        },
        
        // Refresh knowledge graph
        refreshKnowledgeGraph: function() {
            XoptYmiZAdmin.loadKnowledgeGraph();
        },
        
        // Update knowledge graph based on filters
        updateKnowledgeGraph: function() {
            const filter = $('#graph-filter').val();
            const minImportance = $('#importance-slider').val();
            
            XoptYmiZAdmin.loadKnowledgeGraph(filter, minImportance);
        },
        
        // Update importance display
        updateImportanceDisplay: function() {
            const value = $(this).val();
            $('#importance-value').text(value);
        },
        
        // Load knowledge graph
        loadKnowledgeGraph: function(filter = 'all', minImportance = 5) {
            const container = $('#knowledge-graph-container');
            
            if (container.length === 0) return;
            
            container.html('<div class="graph-loading"><span class="spinner is-active"></span><p>Loading knowledge graph...</p></div>');
            
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_knowledge_graph',
                    nonce: xoptymizAjax.nonce,
                    filter: filter,
                    min_importance: minImportance
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.renderKnowledgeGraph(response.data);
                    } else {
                        container.html('<div class="graph-error"><p>Error loading knowledge graph: ' + response.data + '</p></div>');
                    }
                },
                error: function() {
                    container.html('<div class="graph-error"><p>Error loading knowledge graph</p></div>');
                }
            });
        },
        
        // Render knowledge graph with D3.js
        renderKnowledgeGraph: function(data) {
            const container = d3.select('#knowledge-graph-container');
            container.selectAll('*').remove();
            
            if (!data.nodes || data.nodes.length === 0) {
                container.append('div')
                    .attr('class', 'graph-empty')
                    .style('text-align', 'center')
                    .style('padding', '100px 0')
                    .html('<p>No entities found matching the current filters.</p>');
                return;
            }
            
            const width = container.node().clientWidth;
            const height = 600;
            
            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // Create zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.1, 3])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
            
            svg.call(zoom);
            
            const g = svg.append('g');
            
            // Create force simulation
            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.edges).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(d => Math.max(10, d.importance * 3 + 5)));
            
            // Add arrow markers for directed edges
            svg.append('defs').selectAll('marker')
                .data(['arrow'])
                .enter().append('marker')
                .attr('id', 'arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 15)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#999');
            
            // Add edges
            const link = g.append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(data.edges)
                .enter().append('line')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => Math.max(1, d.strength * 3))
                .attr('marker-end', 'url(#arrow)');
            
            // Add nodes
            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(data.nodes)
                .enter().append('circle')
                .attr('r', d => Math.max(5, d.importance * 2))
                .attr('fill', d => XoptYmiZAdmin.getNodeColor(d.type, d.importance))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended))
                .on('click', function(event, d) {
                    XoptYmiZAdmin.showEntityDetails(d);
                });
            
            // Add labels
            const labels = g.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(data.nodes)
                .enter().append('text')
                .text(d => d.label)
                .attr('font-size', d => Math.max(10, d.importance + 5) + 'px')
                .attr('dx', d => Math.max(5, d.importance * 2) + 5)
                .attr('dy', 4)
                .attr('fill', '#333')
                .style('pointer-events', 'none');
            
            // Add tooltips
            node.append('title')
                .text(d => `${d.label}\nType: ${d.type}\nImportance: ${d.importance}\nConfidence: ${(d.confidence * 100).toFixed(1)}%`);
            
            // Update positions on tick
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                
                labels
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            });
            
            // Drag functions
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        },
        
        // Get node color based on type and importance
        getNodeColor: function(type, importance) {
            const colors = {
                'PERSON': '#FF6600',
                'ORGANIZATION': '#0066FF', 
                'LOCATION': '#28A745',
                'CONCEPT': '#6B46C1',
                'TECHNOLOGY': '#DC3545',
                'PRODUCT': '#FFC107',
                'OTHER': '#6C757D'
            };
            
            let baseColor = colors[type] || colors['OTHER'];
            
            // Adjust opacity based on importance
            const opacity = Math.max(0.3, importance / 10);
            return baseColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
        },
        
        // Show entity details modal
        showEntityDetails: function(entity) {
            const modal = $(`
                <div class="xoptymiz-modal">
                    <div class="xoptymiz-modal-content">
                        <div class="xoptymiz-modal-header">
                            <h3>${entity.label}</h3>
                            <button class="xoptymiz-modal-close">&times;</button>
                        </div>
                        <div class="xoptymiz-modal-body">
                            <p><strong>Type:</strong> ${entity.type}</p>
                            <p><strong>Importance:</strong> ${entity.importance}/10</p>
                            <p><strong>Confidence:</strong> ${(entity.confidence * 100).toFixed(1)}%</p>
                            <p><strong>Page Count:</strong> ${entity.pageCount || 'N/A'}</p>
                            <div class="entity-actions">
                                <button class="button" onclick="XoptYmiZAdmin.viewRelatedContent('${entity.id}')">View Related Content</button>
                                <button class="button" onclick="XoptYmiZAdmin.optimizeEntity('${entity.id}')">Optimization Tips</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            
            modal.find('.xoptymiz-modal-close, .xoptymiz-modal').on('click', function(e) {
                if (e.target === this) {
                    modal.remove();
                }
            });
        },
        
        // Initialize charts for analytics
        initializeCharts: function() {
            // Content performance chart
            if ($('#content-performance-chart').length > 0) {
                this.createContentPerformanceChart();
            }
            
            // Entity types distribution chart  
            if ($('#entity-types-chart').length > 0) {
                this.createEntityTypesChart();
            }
        },
        
        // Create content performance chart
        createContentPerformanceChart: function() {
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_performance_data',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.renderPerformanceChart(response.data);
                    }
                }
            });
        },
        
        // Render performance chart
        renderPerformanceChart: function(data) {
            const ctx = document.getElementById('content-performance-chart');
            if (!ctx) return;
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Posts Processed',
                        data: data.processed,
                        borderColor: '#0066FF',
                        backgroundColor: 'rgba(0, 102, 255, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Entities Discovered',
                        data: data.entities,
                        borderColor: '#FF6600',
                        backgroundColor: 'rgba(255, 102, 0, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        },
        
        // Create entity types chart
        createEntityTypesChart: function() {
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_entity_types_data',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.renderEntityTypesChart(response.data);
                    }
                }
            });
        },
        
        // Render entity types chart
        renderEntityTypesChart: function(data) {
            const ctx = document.getElementById('entity-types-chart');
            if (!ctx) return;
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            '#FF6600', '#0066FF', '#28A745', 
                            '#6B46C1', '#DC3545', '#FFC107', '#6C757D'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },
        
        // Load recent activity
        loadRecentActivity: function() {
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_recent_activity',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success && response.data.length > 0) {
                        XoptYmiZAdmin.displayRecentActivity(response.data);
                    }
                }
            });
        },
        
        // Display recent activity
        displayRecentActivity: function(activities) {
            const container = $('#recent-activity-content');
            let html = '<ul class="xoptymiz-activity-list">';
            
            activities.forEach(activity => {
                html += `
                    <li>
                        <div>
                            <strong>${activity.title}</strong> - 
                            ${activity.entities_count} entities, ${activity.relationships_count} relationships
                        </div>
                        <span class="timestamp">${activity.time_ago}</span>
                    </li>
                `;
            });
            
            html += '</ul>';
            container.html(html);
        },
        
        // Load optimization tips
        loadOptimizationTips: function() {
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_optimization_tips',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success && response.data.length > 0) {
                        XoptYmiZAdmin.displayOptimizationTips(response.data);
                    }
                }
            });
        },
        
        // Display optimization tips
        displayOptimizationTips: function(tips) {
            const container = $('#optimization-tips-content');
            let html = '<ul class="xoptymiz-tips-list">';
            
            tips.forEach(tip => {
                html += `<li>💡 ${tip.message}</li>`;
            });
            
            html += '</ul>';
            container.html(html);
        },
        
        // Refresh stats
        refreshStats: function() {
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_get_dashboard_stats',
                    nonce: xoptymizAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.updateDashboardStats(response.data);
                    }
                }
            });
        },
        
        // Update dashboard stats
        updateDashboardStats: function(stats) {
            $('.xoptymiz-stat-card').each(function() {
                const card = $(this);
                const statType = card.data('stat-type');
                
                if (stats[statType]) {
                    card.find('.stat-number').text(stats[statType]);
                    card.addClass('updated');
                    setTimeout(() => card.removeClass('updated'), 1000);
                }
            });
        },
        
        // Show LLMs.txt modal
        showLLMsTxtModal: function(data) {
            const modal = $(`
                <div class="xoptymiz-modal xoptymiz-llms-modal">
                    <div class="xoptymiz-modal-content">
                        <div class="xoptymiz-modal-header">
                            <h3>LLMs.txt Generated Successfully</h3>
                            <button class="xoptymiz-modal-close">&times;</button>
                        </div>
                        <div class="xoptymiz-modal-body">
                            <div class="llms-stats">
                                <div class="stat">
                                    <strong>Size:</strong> ${Math.round(data.size / 1024)} KB
                                </div>
                                <div class="stat">
                                    <strong>Estimated Tokens:</strong> ${data.tokens || 'N/A'}
                                </div>
                                <div class="stat">
                                    <strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a>
                                </div>
                            </div>
                            <div class="llms-actions">
                                <a href="${data.url}" class="button button-primary" target="_blank">View LLMs.txt</a>
                                <button class="button" onclick="XoptYmiZAdmin.copyToClipboard('${data.url}')">Copy URL</button>
                                <button class="button" onclick="XoptYmiZAdmin.downloadLLMsTxt('${data.url}')">Download</button>
                            </div>
                            <div class="llms-preview">
                                <h4>Preview:</h4>
                                <pre class="llms-content-preview">${data.preview || 'Loading preview...'}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            
            modal.find('.xoptymiz-modal-close, .xoptymiz-modal').on('click', function(e) {
                if (e.target === this) {
                    modal.remove();
                }
            });
        },
        
        // Copy to clipboard
        copyToClipboard: function(text) {
            navigator.clipboard.writeText(text).then(() => {
                XoptYmiZAdmin.showNotice('success', 'URL copied to clipboard!');
            }).catch(() => {
                XoptYmiZAdmin.showNotice('error', 'Failed to copy URL');
            });
        },
        
        // Download LLMs.txt
        downloadLLMsTxt: function(url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'llms.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        
        // Create progress modal
        createProgressModal: function() {
            const modal = $(`
                <div class="xoptymiz-modal xoptymiz-progress-modal">
                    <div class="xoptymiz-modal-content">
                        <div class="xoptymiz-modal-header">
                            <h3>Syncing Content</h3>
                        </div>
                        <div class="xoptymiz-modal-body">
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 0%;"></div>
                                </div>
                                <div class="progress-text">
                                    <span class="progress-current">0</span> / <span class="progress-total">0</span> posts processed
                                </div>
                            </div>
                            <div class="progress-log">
                                <div class="log-message">Starting content sync...</div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            
            return {
                updateProgress: function(current, total) {
                    const percentage = Math.round((current / total) * 100);
                    modal.find('.progress-fill').css('width', percentage + '%');
                    modal.find('.progress-current').text(current);
                    modal.find('.progress-total').text(total);
                    modal.find('.log-message').text(`Processing post ${current} of ${total}...`);
                },
                complete: function() {
                    modal.find('.progress-fill').css('width', '100%');
                    modal.find('.log-message').text('Content sync completed successfully!');
                    
                    setTimeout(() => {
                        modal.remove();
                        XoptYmiZAdmin.showNotice('success', 'All content has been processed successfully!');
                    }, 2000);
                }
            };
        },
        
        // Show notification
        showNotice: function(type, message) {
            const notice = $(`
                <div class="xoptymiz-message ${type}">
                    <span class="message-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                    <span class="message-text">${message}</span>
                    <button class="message-close">&times;</button>
                </div>
            `);
            
            $('.xoptymiz-admin').prepend(notice);
            
            notice.find('.message-close').on('click', function() {
                notice.remove();
            });
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                notice.fadeOut(() => notice.remove());
            }, 5000);
        },
        
        // Set button loading state
        setButtonLoading: function(button, text, loading = true) {
            if (loading) {
                button.addClass('xoptymiz-loading')
                      .prop('disabled', true)
                      .text(text);
            } else {
                button.removeClass('xoptymiz-loading')
                      .prop('disabled', false)
                      .text(text);
            }
        },
        
        // Initialize tooltips
        initTooltips: function() {
            $('[data-tooltip]').each(function() {
                const element = $(this);
                const tooltip = $('<div class="xoptymiz-tooltip">' + element.data('tooltip') + '</div>');
                
                element.on('mouseenter', function() {
                    $('body').append(tooltip);
                    tooltip.css({
                        top: element.offset().top - tooltip.outerHeight() - 5,
                        left: element.offset().left + (element.outerWidth() / 2) - (tooltip.outerWidth() / 2)
                    }).fadeIn(200);
                }).on('mouseleave', function() {
                    tooltip.remove();
                });
            });
        },
        
        // Initialize progress bars
        initProgressBars: function() {
            $('.xoptymiz-progress-bar').each(function() {
                const bar = $(this);
                const percentage = bar.data('percentage') || 0;
                
                bar.find('.progress-fill').animate({
                    width: percentage + '%'
                }, 1000);
            });
        },
        
        // Initialize knowledge graph
        initializeKnowledgeGraph: function() {
            if ($('#knowledge-graph-container').length > 0) {
                this.loadKnowledgeGraph();
            }
        },
        
        // Validate settings form
        validateSettings: function(e) {
            const form = $(this);
            let isValid = true;
            
            // Validate API endpoint
            const apiEndpoint = form.find('input[name="api_endpoint"]').val();
            if (apiEndpoint && !XoptYmiZAdmin.isValidUrl(apiEndpoint)) {
                XoptYmiZAdmin.showNotice('error', 'Please enter a valid API endpoint URL.');
                isValid = false;
            }
            
            // Validate numeric fields
            form.find('input[type="number"]').each(function() {
                const input = $(this);
                const value = parseInt(input.val());
                const min = parseInt(input.attr('min'));
                const max = parseInt(input.attr('max'));
                
                if (isNaN(value) || (min !== undefined && value < min) || (max !== undefined && value > max)) {
                    XoptYmiZAdmin.showNotice('error', `Please enter a valid value for ${input.attr('name')}.`);
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
            }
        },
        
        // Handle meta box actions
        handleMetaBoxAction: function(e) {
            e.preventDefault();
            const button = $(this);
            const action = button.data('action');
            const postId = button.data('post-id');
            
            if (action === 'process') {
                XoptYmiZAdmin.processPost(postId, button);
            } else if (action === 'view-entities') {
                XoptYmiZAdmin.viewPostEntities(postId);
            }
        },
        
        // Process single post
        processPost: function(postId, button) {
            const originalText = button.text();
            XoptYmiZAdmin.setButtonLoading(button, 'Processing...');
            
            $.ajax({
                url: xoptymizAjax.ajaxurl,
                type: 'POST',
                data: {
                    action: 'xoptymiz_process_content',
                    nonce: xoptymizAjax.nonce,
                    post_id: postId
                },
                success: function(response) {
                    if (response.success) {
                        XoptYmiZAdmin.showNotice('success', 'Post processed successfully!');
                        // Reload the page to show updated meta box
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    } else {
                        XoptYmiZAdmin.showNotice('error', 'Error: ' + response.data);
                        XoptYmiZAdmin.setButtonLoading(button, originalText, false);
                    }
                },
                error: function() {
                    XoptYmiZAdmin.showNotice('error', 'Processing failed');
                    XoptYmiZAdmin.setButtonLoading(button, originalText, false);
                }
            });
        },
        
        // View post entities
        viewPostEntities: function(postId) {
            window.open(xoptymizAjax.adminUrl + 'admin.php?page=xoptymiz-analytics&post_id=' + postId, '_blank');
        },
        
        // Utility function to validate URLs
        isValidUrl: function(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        },
        
        // Refresh analytics
        refreshAnalytics: function() {
            XoptYmiZAdmin.createContentPerformanceChart();
            XoptYmiZAdmin.createEntityTypesChart();
            XoptYmiZAdmin.loadRecentActivity();
        }
    };
    
    // Initialize XoptYmiZ Admin
    XoptYmiZAdmin.init();
    
    // Make XoptYmiZAdmin globally available
    window.XoptYmiZAdmin = XoptYmiZAdmin;
    
    // Auto-save settings draft
    $('.xoptymiz-settings form input, .xoptymiz-settings form select, .xoptymiz-settings form textarea').on('change', function() {
        const formData = $('.xoptymiz-settings form').serialize();
        localStorage.setItem('xoptymiz_settings_draft', formData);
    });
    
    // Load settings draft on page load
    const settingsDraft = localStorage.getItem('xoptymiz_settings_draft');
    if (settingsDraft && $('.xoptymiz-settings form').length > 0) {
        // Could implement draft restoration here
    }
    
    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Ctrl/Cmd + G: Generate LLMs.txt
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            $('#generate-llms-txt').click();
        }
        
        // Ctrl/Cmd + S: Sync content
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && $('.xoptymiz-admin').length > 0) {
            e.preventDefault();
            $('#sync-all-content').click();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            $('.xoptymiz-modal').remove();
        }
    });
    
    // Handle window resize for knowledge graph
    $(window).on('resize', function() {
        if ($('#knowledge-graph-container svg').length > 0) {
            // Debounce resize
            clearTimeout(window.xoptymizResizeTimeout);
            window.xoptymizResizeTimeout = setTimeout(function() {
                XoptYmiZAdmin.loadKnowledgeGraph();
            }, 300);
        }
    });
});

// Global functions for inline onclick handlers
function processPost(postId) {
    if (window.XoptYmiZAdmin) {
        window.XoptYmiZAdmin.processPost(postId, jQuery('button[onclick*="' + postId + '"]'));
    }
}

function reprocessPost(postId) {
    processPost(postId);
}

function viewEntities(postId) {
    if (window.XoptYmiZAdmin) {
        window.XoptYmiZAdmin.viewPostEntities(postId);
    }
}