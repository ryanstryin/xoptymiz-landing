<?php
/**
 * Plugin Name: XoptYmiZ
 * Plugin URI: https://xoptymiz.com
 * Description: Transform your content for AI discovery with automated LLMs.txt generation and knowledge graph optimization. Easy as XYZ!
 * Version: 1.0.0
 * Author: XoptYmiZ
 * Author URI: https://xoptymiz.com
 * License: GPL v2 or later
 * Text Domain: xoptymiz
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.3
 * Requires PHP: 7.4
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// Define plugin constants
define('XOPTYMIZ_VERSION', '1.0.0');
define('XOPTYMIZ_PLUGIN_FILE', __FILE__);
define('XOPTYMIZ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('XOPTYMIZ_PLUGIN_URL', plugin_dir_url(__FILE__));
define('XOPTYMIZ_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Main plugin class
class XoptYmiZ {
    
    private static $instance = null;
    private $api_handler;
    private $admin_handler;
    private $llms_handler;
    private $settings;
    
    /**
     * Singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->init();
    }
    
    /**
     * Initialize plugin
     */
    private function init() {
        // Load dependencies
        $this->load_dependencies();
        
        // Initialize components
        $this->settings = new XoptYmiZ_Settings();
        $this->api_handler = new XoptYmiZ_API_Handler();
        $this->admin_handler = new XoptYmiZ_Admin();
        $this->llms_handler = new XoptYmiZ_LLMs_Handler();
        
        // Setup hooks
        $this->setup_hooks();
        
        // Load text domain
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        
        // Activation/deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-settings.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-api-handler.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-admin.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-llms-handler.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-knowledge-graph.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/class-content-processor.php';
        require_once XOPTYMIZ_PLUGIN_DIR . 'includes/functions.php';
    }
    
    /**
     * Setup WordPress hooks
     */
    private function setup_hooks() {
        // Post save hook for automatic processing
        add_action('save_post', array($this, 'process_post_on_save'), 10, 2);
        
        // Add llms.txt endpoint
        add_action('init', array($this, 'add_rewrite_rules'));
        add_action('template_redirect', array($this, 'handle_llms_txt_request'));
        
        // Enqueue scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        
        // Add menu icon SVG
        add_action('admin_head', array($this, 'add_menu_icon_style'));
        
        // AJAX handlers
        add_action('wp_ajax_xoptymiz_process_content', array($this, 'ajax_process_content'));
        add_action('wp_ajax_xoptymiz_generate_llms_txt', array($this, 'ajax_generate_llms_txt'));
        add_action('wp_ajax_xoptymiz_get_analytics', array($this, 'ajax_get_analytics'));
        add_action('wp_ajax_xoptymiz_sync_all_content', array($this, 'ajax_sync_all_content'));
        
        // Add settings link to plugins page
        add_filter('plugin_action_links_' . XOPTYMIZ_PLUGIN_BASENAME, array($this, 'add_settings_link'));
    }
    
    /**
     * Process post when saved
     */
    public function process_post_on_save($post_id, $post) {
        // Skip if it's an autosave, revision, or not published
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id) || $post->post_status !== 'publish') {
            return;
        }
        
        // Skip if auto-processing is disabled
        if (!$this->settings->get_option('auto_process', true)) {
            return;
        }
        
        // Skip if post type is excluded
        $excluded_types = $this->settings->get_option('excluded_post_types', array());
        if (in_array($post->post_type, $excluded_types)) {
            return;
        }
        
        // Process content asynchronously
        wp_schedule_single_event(time() + 10, 'xoptymiz_process_content', array($post_id));
    }
    
    /**
     * Add rewrite rules for llms.txt
     */
    public function add_rewrite_rules() {
        add_rewrite_rule('^llms\.txt$', 'index.php?xoptymiz_llms_txt=1', 'top');
        add_rewrite_rule('^llms-full\.txt$', 'index.php?xoptymiz_llms_full_txt=1', 'top');
        
        // Add query vars
        add_filter('query_vars', function($vars) {
            $vars[] = 'xoptymiz_llms_txt';
            $vars[] = 'xoptymiz_llms_full_txt';
            return $vars;
        });
    }
    
    /**
     * Handle llms.txt requests
     */
    public function handle_llms_txt_request() {
        global $wp_query;
        
        if (get_query_var('xoptymiz_llms_txt')) {
            $this->serve_llms_txt(false);
        } elseif (get_query_var('xoptymiz_llms_full_txt')) {
            $this->serve_llms_txt(true);
        }
    }
    
    /**
     * Serve llms.txt content
     */
    private function serve_llms_txt($full_version = false) {
        // Set headers
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: public, max-age=3600');
        
        try {
            $domain = parse_url(home_url(), PHP_URL_HOST);
            $content = $this->llms_handler->generate_llms_txt($domain, $full_version);
            
            if ($content) {
                echo $content;
            } else {
                http_response_code(404);
                echo "# LLMs.txt not available\n\nPlease process your content first in the XoptYmiZ dashboard.";
            }
            
        } catch (Exception $e) {
            http_response_code(500);
            echo "# Error generating LLMs.txt\n\n" . esc_html($e->getMessage());
        }
        
        exit;
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        // Only load on XoptYmiZ pages
        if (strpos($hook, 'xoptymiz') === false) {
            return;
        }
        
        wp_enqueue_script('xoptymiz-admin', XOPTYMIZ_PLUGIN_URL . 'assets/js/admin.js', array('jquery', 'wp-util'), XOPTYMIZ_VERSION, true);
        wp_enqueue_style('xoptymiz-admin', XOPTYMIZ_PLUGIN_URL . 'assets/css/admin.css', array(), XOPTYMIZ_VERSION);
        
        // Add D3.js for knowledge graph visualization
        wp_enqueue_script('d3', 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js', array(), '7.8.5', true);
        
        // Localize script
        wp_localize_script('xoptymiz-admin', 'xoptymizAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('xoptymiz_nonce'),
            'strings' => array(
                'processing' => __('Processing...', 'xoptymiz'),
                'success' => __('Success!', 'xoptymiz'),
                'error' => __('Error occurred', 'xoptymiz'),
                'confirm_sync' => __('This will process all published posts. Continue?', 'xoptymiz')
            )
        ));
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_frontend_scripts() {
        // Only if frontend features are enabled
        if ($this->settings->get_option('enable_frontend_features', false)) {
            wp_enqueue_style('xoptymiz-frontend', XOPTYMIZ_PLUGIN_URL . 'assets/css/frontend.css', array(), XOPTYMIZ_VERSION);
        }
    }
    
    /**
     * Add menu icon style
     */
    public function add_menu_icon_style() {
        ?>
        <style>
        .xoptymiz-menu-icon {
            background: url('data:image/svg+xml;base64,<?php echo base64_encode($this->get_menu_icon_svg()); ?>') no-repeat center;
            background-size: 20px 20px;
        }
        .xoptymiz-menu-icon:before {
            content: ' ';
        }
        </style>
        <?php
    }
    
    /**
     * Get menu icon SVG
     */
    private function get_menu_icon_svg() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <polygon points="50,15 75,30 75,50 50,65 25,50 25,30" fill="#FF6600"/>
            <polygon points="30,35 50,25 70,35 50,45" fill="#FF7700"/>
            <text x="15" y="80" font-size="18" fill="#FF6600" font-weight="bold">&lt;</text>
            <text x="70" y="80" font-size="18" fill="#FF6600" font-weight="bold">&gt;</text>
        </svg>';
    }
    
    /**
     * AJAX: Process content
     */
    public function ajax_process_content() {
        check_ajax_referer('xoptymiz_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Permission denied', 'xoptymiz'));
        }
        
        $post_id = intval($_POST['post_id']);
        
        try {
            $result = $this->api_handler->process_post($post_id);
            wp_send_json_success($result);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX: Generate LLMs.txt
     */
    public function ajax_generate_llms_txt() {
        check_ajax_referer('xoptymiz_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Permission denied', 'xoptymiz'));
        }
        
        try {
            $domain = parse_url(home_url(), PHP_URL_HOST);
            $content = $this->llms_handler->generate_llms_txt($domain);
            
            wp_send_json_success(array(
                'content' => $content,
                'size' => strlen($content),
                'url' => home_url('/llms.txt')
            ));
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX: Get analytics
     */
    public function ajax_get_analytics() {
        check_ajax_referer('xoptymiz_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Permission denied', 'xoptymiz'));
        }
        
        try {
            $analytics = $this->api_handler->get_analytics();
            wp_send_json_success($analytics);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX: Sync all content
     */
    public function ajax_sync_all_content() {
        check_ajax_referer('xoptymiz_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Permission denied', 'xoptymiz'));
        }
        
        try {
            $result = $this->api_handler->sync_all_content();
            wp_send_json_success($result);
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=xoptymiz') . '">' . __('Settings', 'xoptymiz') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    /**
     * Load plugin text domain
     */
    public function load_textdomain() {
        load_plugin_textdomain('xoptymiz', false, dirname(XOPTYMIZ_PLUGIN_BASENAME) . '/languages');
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables
        $this->create_database_tables();
        
        // Add rewrite rules and flush
        $this->add_rewrite_rules();
        flush_rewrite_rules();
        
        // Set default options
        $this->settings->set_default_options();
        
        // Schedule cron jobs
        if (!wp_next_scheduled('xoptymiz_daily_sync')) {
            wp_schedule_event(time(), 'daily', 'xoptymiz_daily_sync');
        }
        
        // Add custom cron schedule if it doesn't exist
        add_filter('cron_schedules', array($this, 'add_cron_schedules'));
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Clear scheduled events
        wp_clear_scheduled_hook('xoptymiz_daily_sync');
        wp_clear_scheduled_hook('xoptymiz_process_content');
    }
    
    /**
     * Create database tables
     */
    private function create_database_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Processed content table
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            post_id bigint(20) NOT NULL,
            content_hash varchar(64) NOT NULL,
            entities_count int(11) DEFAULT 0,
            relationships_count int(11) DEFAULT 0,
            confidence_score decimal(3,2) DEFAULT 0.00,
            llms_txt_generated tinyint(1) DEFAULT 0,
            processing_time int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY post_id (post_id),
            KEY content_hash (content_hash),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
        
        // Analytics table
        $analytics_table = $wpdb->prefix . 'xoptymiz_analytics';
        
        $analytics_sql = "CREATE TABLE $analytics_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            metric_name varchar(255) NOT NULL,
            metric_value longtext,
            date_recorded date NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY metric_name (metric_name),
            KEY date_recorded (date_recorded)
        ) $charset_collate;";
        
        dbDelta($analytics_sql);
    }
    
    /**
     * Add custom cron schedules
     */
    public function add_cron_schedules($schedules) {
        $schedules['xoptymiz_hourly'] = array(
            'interval' => 3600, // 1 hour
            'display' => __('XoptYmiZ Hourly', 'xoptymiz')
        );
        
        return $schedules;
    }
}

// Initialize plugin
function xoptymiz_init() {
    return XoptYmiZ::get_instance();
}

// Hook into WordPress
add_action('plugins_loaded', 'xoptymiz_init');

// Scheduled content processing
add_action('xoptymiz_process_content', function($post_id) {
    $xoptymiz = XoptYmiZ::get_instance();
    $xoptymiz->api_handler->process_post($post_id);
});

// Daily sync
add_action('xoptymiz_daily_sync', function() {
    $xoptymiz = XoptYmiZ::get_instance();
    $xoptymiz->api_handler->daily_maintenance();
});

?>

<?php
/**
 * XoptYmiZ Settings Class
 * File: includes/class-settings.php
 */

if (!defined('ABSPATH')) {
    exit;
}

class XoptYmiZ_Settings {
    
    private $option_name = 'xoptymiz_settings';
    private $defaults = array();
    
    public function __construct() {
        $this->set_defaults();
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Set default options
     */
    private function set_defaults() {
        $this->defaults = array(
            'api_endpoint' => 'https://api.xoptymiz.com/v1',
            'api_key' => '',
            'auto_process' => true,
            'generate_llms_txt' => true,
            'include_metadata' => true,
            'max_entities' => 50,
            'min_entity_importance' => 5,
            'excluded_post_types' => array('revision', 'attachment'),
            'enable_knowledge_graph' => true,
            'enable_frontend_features' => false,
            'cache_duration' => 3600, // 1 hour
            'batch_size' => 10,
            'processing_delay' => 5 // seconds
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('xoptymiz_settings', $this->option_name, array(
            'sanitize_callback' => array($this, 'sanitize_options')
        ));
    }
    
    /**
     * Get option value
     */
    public function get_option($key, $default = null) {
        $options = get_option($this->option_name, $this->defaults);
        
        if (isset($options[$key])) {
            return $options[$key];
        }
        
        return $default !== null ? $default : (isset($this->defaults[$key]) ? $this->defaults[$key] : null);
    }
    
    /**
     * Update option
     */
    public function update_option($key, $value) {
        $options = get_option($this->option_name, $this->defaults);
        $options[$key] = $value;
        return update_option($this->option_name, $options);
    }
    
    /**
     * Get all options
     */
    public function get_options() {
        return wp_parse_args(get_option($this->option_name, array()), $this->defaults);
    }
    
    /**
     * Set default options on activation
     */
    public function set_default_options() {
        if (!get_option($this->option_name)) {
            update_option($this->option_name, $this->defaults);
        }
    }
    
    /**
     * Sanitize options
     */
    public function sanitize_options($options) {
        $sanitized = array();
        
        foreach ($options as $key => $value) {
            switch ($key) {
                case 'api_endpoint':
                    $sanitized[$key] = esc_url_raw($value);
                    break;
                    
                case 'api_key':
                    $sanitized[$key] = sanitize_text_field($value);
                    break;
                    
                case 'auto_process':
                case 'generate_llms_txt':
                case 'include_metadata':
                case 'enable_knowledge_graph':
                case 'enable_frontend_features':
                    $sanitized[$key] = (bool) $value;
                    break;
                    
                case 'max_entities':
                case 'min_entity_importance':
                case 'cache_duration':
                case 'batch_size':
                case 'processing_delay':
                    $sanitized[$key] = absint($value);
                    break;
                    
                case 'excluded_post_types':
                    $sanitized[$key] = array_map('sanitize_text_field', (array) $value);
                    break;
                    
                default:
                    $sanitized[$key] = sanitize_text_field($value);
                    break;
            }
        }
        
        return $sanitized;
    }
}

?>

<?php
/**
 * XoptYmiZ Admin Class
 * File: includes/class-admin.php
 */

if (!defined('ABSPATH')) {
    exit;
}

class XoptYmiZ_Admin {
    
    private $settings;
    
    public function __construct() {
        $this->settings = new XoptYmiZ_Settings();
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Add meta boxes
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        
        // Add admin notices
        add_action('admin_notices', array($this, 'admin_notices'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        // Main menu page
        add_menu_page(
            __('XoptYmiZ Dashboard', 'xoptymiz'),
            'XoptYmiZ',
            'manage_options',
            'xoptymiz',
            array($this, 'dashboard_page'),
            'xoptymiz-menu-icon',
            30
        );
        
        // Dashboard submenu
        add_submenu_page(
            'xoptymiz',
            __('Dashboard', 'xoptymiz'),
            __('Dashboard', 'xoptymiz'),
            'manage_options',
            'xoptymiz',
            array($this, 'dashboard_page')
        );
        
        // Analytics submenu
        add_submenu_page(
            'xoptymiz',
            __('Analytics', 'xoptymiz'),
            __('Analytics', 'xoptymiz'),
            'manage_options',
            'xoptymiz-analytics',
            array($this, 'analytics_page')
        );
        
        // Knowledge Graph submenu
        add_submenu_page(
            'xoptymiz',
            __('Knowledge Graph', 'xoptymiz'),
            __('Knowledge Graph', 'xoptymiz'),
            'manage_options',
            'xoptymiz-knowledge-graph',
            array($this, 'knowledge_graph_page')
        );
        
        // Settings submenu
        add_submenu_page(
            'xoptymiz',
            __('Settings', 'xoptymiz'),
            __('Settings', 'xoptymiz'),
            'manage_options',
            'xoptymiz-settings',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Dashboard page
     */
    public function dashboard_page() {
        $processed_posts = $this->get_processed_posts_count();
        $total_entities = $this->get_total_entities_count();
        $llms_txt_size = $this->get_llms_txt_info();
        ?>
        <div class="wrap xoptymiz-admin">
            <div class="xoptymiz-header">
                <div class="xoptymiz-logo">
                    <svg width="60" height="60" viewBox="0 0 100 100">
                        <polygon points="50,15 75,30 75,50 50,65 25,50 25,30" fill="#FF6600"/>
                        <polygon points="30,35 50,25 70,35 50,45" fill="#FF7700"/>
                        <text x="15" y="80" font-size="18" fill="#FF6600" font-weight="bold">&lt;</text>
                        <text x="70" y="80" font-size="18" fill="#FF6600" font-weight="bold">&gt;</text>
                    </svg>
                </div>
                <div class="xoptymiz-header-text">
                    <h1><?php _e('XoptYmiZ Dashboard', 'xoptymiz'); ?></h1>
                    <p class="xoptymiz-tagline"><?php _e('Optimization in Every Dimension', 'xoptymiz'); ?></p>
                </div>
            </div>
            
            <div class="xoptymiz-stats-grid">
                <div class="xoptymiz-stat-card">
                    <div class="stat-number"><?php echo esc_html($processed_posts); ?></div>
                    <div class="stat-label"><?php _e('Posts Processed', 'xoptymiz'); ?></div>
                    <div class="stat-icon">📄</div>
                </div>
                
                <div class="xoptymiz-stat-card">
                    <div class="stat-number"><?php echo esc_html($total_entities); ?></div>
                    <div class="stat-label"><?php _e('Entities Discovered', 'xoptymiz'); ?></div>
                    <div class="stat-icon">🧠</div>
                </div>
                
                <div class="xoptymiz-stat-card">
                    <div class="stat-number"><?php echo esc_html($llms_txt_size['size_kb']); ?>KB</div>
                    <div class="stat-label"><?php _e('LLMs.txt Size', 'xoptymiz'); ?></div>
                    <div class="stat-icon">📝</div>
                </div>
                
                <div class="xoptymiz-stat-card">
                    <div class="stat-number"><?php echo esc_html($this->get_optimization_score()); ?>%</div>
                    <div class="stat-label"><?php _e('AI Optimization Score', 'xoptymiz'); ?></div>
                    <div class="stat-icon">⚡</div>
                </div>
            </div>
            
            <div class="xoptymiz-actions-section">
                <h2><?php _e('Quick Actions', 'xoptymiz'); ?></h2>
                
                <div class="xoptymiz-action-buttons">
                    <button id="generate-llms-txt" class="button button-primary button-hero">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Generate LLMs.txt', 'xoptymiz'); ?>
                    </button>
                    
                    <button id="sync-all-content" class="button button-secondary button-hero">
                        <span class="dashicons dashicons-update"></span>
                        <?php _e('Sync All Content', 'xoptymiz'); ?>
                    </button>
                    
                    <a href="<?php echo esc_url(home_url('/llms.txt')); ?>" class="button button-secondary button-hero" target="_blank">
                        <span class="dashicons dashicons-external"></span>
                        <?php _e('View LLMs.txt', 'xoptymiz'); ?>
                    </a>
                    
                    <a href="<?php echo esc_url(admin_url('admin.php?page=xoptymiz-knowledge-graph')); ?>" class="button button-secondary button-hero">
                        <span class="dashicons dashicons-networking"></span>
                        <?php _e('View Knowledge Graph', 'xoptymiz'); ?>
                    </a>
                </div>
            </div>
            
            <div class="xoptymiz-recent-activity">
                <h2><?php _e('Recent Activity', 'xoptymiz'); ?></h2>
                <div id="recent-activity-content">
                    <?php $this->display_recent_activity(); ?>
                </div>
            </div>
            
            <div class="xoptymiz-optimization-tips">
                <h2><?php _e('Optimization Suggestions', 'xoptymiz'); ?></h2>
                <div id="optimization-tips-content">
                    <?php $this->display_optimization_tips(); ?>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Analytics page
     */
    public function analytics_page() {
        ?>
        <div class="wrap xoptymiz-admin">
            <h1><?php _e('XoptYmiZ Analytics', 'xoptymiz'); ?></h1>
            
            <div class="xoptymiz-analytics-dashboard">
                <div class="analytics-section">
                    <h2><?php _e('Content Performance', 'xoptymiz'); ?></h2>
                    <canvas id="content-performance-chart" width="800" height="400"></canvas>
                </div>
                
                <div class="analytics-section">
                    <h2><?php _e('Entity Types Distribution', 'xoptymiz'); ?></h2>
                    <canvas id="entity-types-chart" width="400" height="400"></canvas>
                </div>
                
                <div class="analytics-section">
                    <h2><?php _e('Top Performing Entities', 'xoptymiz'); ?></h2>
                    <div id="top-entities-list"></div>
                </div>
                
                <div class="analytics-section">
                    <h2><?php _e('Content Gaps Analysis', 'xoptymiz'); ?></h2>
                    <div id="content-gaps-analysis"></div>
                </div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            // Load analytics data
            $.post(ajaxurl, {
                action: 'xoptymiz_get_analytics',
                nonce: xoptymizAjax.nonce
            }, function(response) {
                if (response.success) {
                    renderAnalytics(response.data);
                }
            });
        });
        
        function renderAnalytics(data) {
            // Render charts and data visualizations
            console.log('Analytics data:', data);
        }
        </script>
        <?php
    }
    
    /**
     * Knowledge Graph page
     */
    public function knowledge_graph_page() {
        ?>
        <div class="wrap xoptymiz-admin">
            <h1><?php _e('Knowledge Graph Visualization', 'xoptymiz'); ?></h1>
            
            <div class="xoptymiz-knowledge-graph-controls">
                <div class="control-group">
                    <label for="graph-filter"><?php _e('Filter by Entity Type:', 'xoptymiz'); ?></label>
                    <select id="graph-filter">
                        <option value="all"><?php _e('All Types', 'xoptymiz'); ?></option>
                        <option value="PERSON"><?php _e('People', 'xoptymiz'); ?></option>
                        <option value="ORGANIZATION"><?php _e('Organizations', 'xoptymiz'); ?></option>
                        <option value="LOCATION"><?php _e('Locations', 'xoptymiz'); ?></option>
                        <option value="CONCEPT"><?php _e('Concepts', 'xoptymiz'); ?></option>
                        <option value="TECHNOLOGY"><?php _e('Technology', 'xoptymiz'); ?></option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="importance-slider"><?php _e('Min Importance:', 'xoptymiz'); ?></label>
                    <input type="range" id="importance-slider" min="1" max="10" value="5">
                    <span id="importance-value">5</span>
                </div>
                
                <button id="refresh-graph" class="button button-primary">
                    <?php _e('Refresh Graph', 'xoptymiz'); ?>
                </button>
            </div>
            
            <div id="knowledge-graph-container" style="width: 100%; height: 600px; border: 1px solid #ddd; background: #f9f9f9;">
                <div class="graph-loading" style="text-align: center; padding: 200px 0;">
                    <span class="spinner is-active"></span>
                    <p><?php _e('Loading knowledge graph...', 'xoptymiz'); ?></p>
                </div>
            </div>
            
            <div class="xoptymiz-graph-legend">
                <h3><?php _e('Legend', 'xoptymiz'); ?></h3>
                <div class="legend-items">
                    <div class="legend-item">
                        <div class="legend-color" style="background: #FF6600;"></div>
                        <span><?php _e('High Importance (8-10)', 'xoptymiz'); ?></span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #0066FF;"></div>
                        <span><?php _e('Medium Importance (5-7)', 'xoptymiz'); ?></span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #6B46C1;"></div>
                        <span><?php _e('Low Importance (1-4)', 'xoptymiz'); ?></span>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            loadKnowledgeGraph();
            
            $('#refresh-graph, #graph-filter, #importance-slider').on('change', function() {
                loadKnowledgeGraph();
            });
            
            $('#importance-slider').on('input', function() {
                $('#importance-value').text($(this).val());
            });
        });
        
        function loadKnowledgeGraph() {
            const filter = jQuery('#graph-filter').val();
            const minImportance = jQuery('#importance-slider').val();
            
            jQuery.post(ajaxurl, {
                action: 'xoptymiz_get_knowledge_graph',
                nonce: xoptymizAjax.nonce,
                filter: filter,
                min_importance: minImportance
            }, function(response) {
                if (response.success) {
                    renderKnowledgeGraph(response.data);
                }
            });
        }
        
        function renderKnowledgeGraph(data) {
            // D3.js knowledge graph visualization
            const container = d3.select('#knowledge-graph-container');
            container.selectAll('*').remove();
            
            const width = 800;
            const height = 600;
            
            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // Create force simulation
            const simulation = d3.forceSimulation(data.nodes)
                .force('link', d3.forceLink(data.edges).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2));
            
            // Add edges
            const link = svg.append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(data.edges)
                .enter().append('line')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => Math.sqrt(d.strength * 10));
            
            // Add nodes
            const node = svg.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(data.nodes)
                .enter().append('circle')
                .attr('r', d => Math.max(5, d.importance * 2))
                .attr('fill', d => getNodeColor(d.importance))
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));
            
            // Add labels
            const labels = svg.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(data.nodes)
                .enter().append('text')
                .text(d => d.label)
                .attr('font-size', '12px')
                .attr('dx', 15)
                .attr('dy', 4);
            
            // Add tooltips
            node.append('title')
                .text(d => `${d.label}\nType: ${d.type}\nImportance: ${d.importance}`);
            
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
            
            function getNodeColor(importance) {
                if (importance >= 8) return '#FF6600';
                if (importance >= 5) return '#0066FF';
                return '#6B46C1';
            }
            
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
        }
        </script>
        <?php
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        if (isset($_POST['submit'])) {
            check_admin_referer('xoptymiz_settings_nonce');
            
            $options = array();
            $options['api_endpoint'] = sanitize_url($_POST['api_endpoint']);
            $options['api_key'] = sanitize_text_field($_POST['api_key']);
            $options['auto_process'] = isset($_POST['auto_process']);
            $options['generate_llms_txt'] = isset($_POST['generate_llms_txt']);
            $options['include_metadata'] = isset($_POST['include_metadata']);
            $options['max_entities'] = absint($_POST['max_entities']);
            $options['min_entity_importance'] = absint($_POST['min_entity_importance']);
            $options['excluded_post_types'] = array_map('sanitize_text_field', (array) $_POST['excluded_post_types']);
            $options['enable_knowledge_graph'] = isset($_POST['enable_knowledge_graph']);
            $options['enable_frontend_features'] = isset($_POST['enable_frontend_features']);
            $options['cache_duration'] = absint($_POST['cache_duration']);
            $options['batch_size'] = absint($_POST['batch_size']);
            $options['processing_delay'] = absint($_POST['processing_delay']);
            
            update_option('xoptymiz_settings', $options);
            
            echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'xoptymiz') . '</p></div>';
        }
        
        $options = $this->settings->get_options();
        $post_types = get_post_types(array('public' => true), 'objects');
        ?>
        <div class="wrap xoptymiz-admin">
            <h1><?php _e('XoptYmiZ Settings', 'xoptymiz'); ?></h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('xoptymiz_settings_nonce'); ?>
                
                <table class="form-table">
                    <tbody>
                        <tr>
                            <th scope="row"><?php _e('API Endpoint', 'xoptymiz'); ?></th>
                            <td>
                                <input type="url" name="api_endpoint" value="<?php echo esc_attr($options['api_endpoint']); ?>" class="regular-text" />
                                <p class="description"><?php _e('XoptYmiZ API endpoint URL.', 'xoptymiz'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('API Key', 'xoptymiz'); ?></th>
                            <td>
                                <input type="password" name="api_key" value="<?php echo esc_attr($options['api_key']); ?>" class="regular-text" />
                                <p class="description"><?php _e('Your XoptYmiZ API key for authentication.', 'xoptymiz'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Processing Options', 'xoptymiz'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="auto_process" <?php checked($options['auto_process']); ?> />
                                        <?php _e('Automatically process content when posts are published', 'xoptymiz'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="generate_llms_txt" <?php checked($options['generate_llms_txt']); ?> />
                                        <?php _e('Generate LLMs.txt file automatically', 'xoptymiz'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="include_metadata" <?php checked($options['include_metadata']); ?> />
                                        <?php _e('Include metadata in generated files', 'xoptymiz'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="enable_knowledge_graph" <?php checked($options['enable_knowledge_graph']); ?> />
                                        <?php _e('Enable knowledge graph visualization', 'xoptymiz'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="enable_frontend_features" <?php checked($options['enable_frontend_features']); ?> />
                                        <?php _e('Enable frontend features', 'xoptymiz'); ?>
                                    </label>
                                </fieldset>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Entity Settings', 'xoptymiz'); ?></th>
                            <td>
                                <label for="max_entities"><?php _e('Maximum entities per post:', 'xoptymiz'); ?></label>
                                <input type="number" name="max_entities" id="max_entities" value="<?php echo esc_attr($options['max_entities']); ?>" min="10" max="200" />
                                <br><br>
                                
                                <label for="min_entity_importance"><?php _e('Minimum entity importance (1-10):', 'xoptymiz'); ?></label>
                                <input type="number" name="min_entity_importance" id="min_entity_importance" value="<?php echo esc_attr($options['min_entity_importance']); ?>" min="1" max="10" />
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Excluded Post Types', 'xoptymiz'); ?></th>
                            <td>
                                <fieldset>
                                    <?php foreach ($post_types as $post_type): ?>
                                        <label>
                                            <input type="checkbox" name="excluded_post_types[]" value="<?php echo esc_attr($post_type->name); ?>" 
                                                   <?php checked(in_array($post_type->name, $options['excluded_post_types'])); ?> />
                                            <?php echo esc_html($post_type->label); ?>
                                        </label><br>
                                    <?php endforeach; ?>
                                </fieldset>
                                <p class="description"><?php _e('Select post types to exclude from automatic processing.', 'xoptymiz'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Performance Settings', 'xoptymiz'); ?></th>
                            <td>
                                <label for="cache_duration"><?php _e('Cache duration (seconds):', 'xoptymiz'); ?></label>
                                <input type="number" name="cache_duration" id="cache_duration" value="<?php echo esc_attr($options['cache_duration']); ?>" min="300" max="86400" />
                                <br><br>
                                
                                <label for="batch_size"><?php _e('Batch processing size:', 'xoptymiz'); ?></label>
                                <input type="number" name="batch_size" id="batch_size" value="<?php echo esc_attr($options['batch_size']); ?>" min="1" max="50" />
                                <br><br>
                                
                                <label for="processing_delay"><?php _e('Processing delay (seconds):', 'xoptymiz'); ?></label>
                                <input type="number" name="processing_delay" id="processing_delay" value="<?php echo esc_attr($options['processing_delay']); ?>" min="0" max="60" />
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <div class="xoptymiz-settings-info">
                <h2><?php _e('System Information', 'xoptymiz'); ?></h2>
                <table class="widefat striped">
                    <tbody>
                        <tr>
                            <td><strong><?php _e('Plugin Version:', 'xoptymiz'); ?></strong></td>
                            <td><?php echo XOPTYMIZ_VERSION; ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('WordPress Version:', 'xoptymiz'); ?></strong></td>
                            <td><?php echo get_bloginfo('version'); ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('PHP Version:', 'xoptymiz'); ?></strong></td>
                            <td><?php echo PHP_VERSION; ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('Database Tables:', 'xoptymiz'); ?></strong></td>
                            <td><?php echo $this->check_database_tables() ? __('✅ Created', 'xoptymiz') : __('❌ Missing', 'xoptymiz'); ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('LLMs.txt URL:', 'xoptymiz'); ?></strong></td>
                            <td><a href="<?php echo esc_url(home_url('/llms.txt')); ?>" target="_blank"><?php echo esc_url(home_url('/llms.txt')); ?></a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
    
    /**
     * Add meta boxes to post edit screens
     */
    public function add_meta_boxes() {
        $post_types = get_post_types(array('public' => true));
        
        foreach ($post_types as $post_type) {
            add_meta_box(
                'xoptymiz_meta_box',
                __('XoptYmiZ Optimization', 'xoptymiz'),
                array($this, 'meta_box_callback'),
                $post_type,
                'side',
                'default'
            );
        }
    }
    
    /**
     * Meta box callback
     */
    public function meta_box_callback($post) {
        $processed_data = $this->get_post_processing_data($post->ID);
        ?>
        <div class="xoptymiz-meta-box">
            <?php if ($processed_data): ?>
                <div class="xoptymiz-status processed">
                    <span class="status-icon">✅</span>
                    <strong><?php _e('Processed', 'xoptymiz'); ?></strong>
                </div>
                
                <div class="xoptymiz-stats">
                    <div class="stat">
                        <span class="label"><?php _e('Entities:', 'xoptymiz'); ?></span>
                        <span class="value"><?php echo esc_html($processed_data['entities_count']); ?></span>
                    </div>
                    <div class="stat">
                        <span class="label"><?php _e('Relationships:', 'xoptymiz'); ?></span>
                        <span class="value"><?php echo esc_html($processed_data['relationships_count']); ?></span>
                    </div>
                    <div class="stat">
                        <span class="label"><?php _e('Confidence:', 'xoptymiz'); ?></span>
                        <span class="value"><?php echo esc_html($processed_data['confidence_score'] * 100); ?>%</span>
                    </div>
                </div>
                
                <div class="xoptymiz-actions">
                    <button type="button" class="button button-small" onclick="reprocessPost(<?php echo esc_js($post->ID); ?>)">
                        <?php _e('Reprocess', 'xoptymiz'); ?>
                    </button>
                    <button type="button" class="button button-small" onclick="viewEntities(<?php echo esc_js($post->ID); ?>)">
                        <?php _e('View Entities', 'xoptymiz'); ?>
                    </button>
                </div>
            <?php else: ?>
                <div class="xoptymiz-status unprocessed">
                    <span class="status-icon">⏳</span>
                    <strong><?php _e('Not Processed', 'xoptymiz'); ?></strong>
                </div>
                
                <button type="button" class="button button-primary button-small" onclick="processPost(<?php echo esc_js($post->ID); ?>)">
                    <?php _e('Process Now', 'xoptymiz'); ?>
                </button>
            <?php endif; ?>
        </div>
        
        <script>
        function processPost(postId) {
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '<?php _e('Processing...', 'xoptymiz'); ?>';
            button.disabled = true;
            
            jQuery.post(ajaxurl, {
                action: 'xoptymiz_process_content',
                nonce: '<?php echo wp_create_nonce('xoptymiz_nonce'); ?>',
                post_id: postId
            }, function(response) {
                if (response.success) {
                    location.reload();
                } else {
                    alert('<?php _e('Processing failed:', 'xoptymiz'); ?> ' + response.data);
                    button.textContent = originalText;
                    button.disabled = false;
                }
            });
        }
        
        function reprocessPost(postId) {
            processPost(postId);
        }
        
        function viewEntities(postId) {
            // Open entities modal or redirect to detailed view
            window.open('<?php echo admin_url('admin.php?page=xoptymiz-analytics&post_id='); ?>' + postId, '_blank');
        }
        </script>
        <?php
    }
    
    /**
     * Admin notices
     */
    public function admin_notices() {
        // Check if API key is set
        if (!$this->settings->get_option('api_key')) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong><?php _e('XoptYmiZ:', 'xoptymiz'); ?></strong>
                    <?php printf(
                        __('Please configure your API key in the <a href="%s">settings</a> to start optimizing your content.', 'xoptymiz'),
                        admin_url('admin.php?page=xoptymiz-settings')
                    ); ?>
                </p>
            </div>
            <?php
        }
        
        // Check if LLMs.txt is accessible
        if ($this->settings->get_option('generate_llms_txt') && !$this->is_llms_txt_accessible()) {
            ?>
            <div class="notice notice-error">
                <p>
                    <strong><?php _e('XoptYmiZ:', 'xoptymiz'); ?></strong>
                    <?php _e('LLMs.txt file is not accessible. Please check your permalink settings.', 'xoptymiz'); ?>
                </p>
            </div>
            <?php
        }
    }
    
    // Helper methods
    private function get_processed_posts_count() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        return $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    }
    
    private function get_total_entities_count() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        return $wpdb->get_var("SELECT SUM(entities_count) FROM $table_name");
    }
    
    private function get_llms_txt_info() {
        $llms_txt_url = home_url('/llms.txt');
        $response = wp_remote_head($llms_txt_url);
        
        if (!is_wp_error($response)) {
            $size = wp_remote_retrieve_header($response, 'content-length');
            return array(
                'size_bytes' => intval($size),
                'size_kb' => round(intval($size) / 1024, 1),
                'accessible' => true
            );
        }
        
        return array('size_bytes' => 0, 'size_kb' => 0, 'accessible' => false);
    }
    
    private function get_optimization_score() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        $avg_confidence = $wpdb->get_var("SELECT AVG(confidence_score) FROM $table_name");
        return round($avg_confidence * 100);
    }
    
    private function get_post_processing_data($post_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE post_id = %d", $post_id), ARRAY_A);
    }
    
    private function display_recent_activity() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        
        $recent_activity = $wpdb->get_results("
            SELECT pc.*, p.post_title 
            FROM $table_name pc 
            JOIN {$wpdb->posts} p ON pc.post_id = p.ID 
            ORDER BY pc.updated_at DESC 
            LIMIT 10
        ");
        
        if ($recent_activity) {
            echo '<ul class="xoptymiz-activity-list">';
            foreach ($recent_activity as $activity) {
                echo '<li>';
                echo '<strong>' . esc_html($activity->post_title) . '</strong> - ';
                echo sprintf(__('%d entities, %d relationships', 'xoptymiz'), $activity->entities_count, $activity->relationships_count);
                echo ' <span class="timestamp">' . human_time_diff(strtotime($activity->updated_at), current_time('timestamp')) . ' ago</span>';
                echo '</li>';
            }
            echo '</ul>';
        } else {
            echo '<p>' . __('No recent activity.', 'xoptymiz') . '</p>';
        }
    }
    
    private function display_optimization_tips() {
        $tips = array(
            __('Ensure your content includes clear entity mentions for better AI understanding.', 'xoptymiz'),
            __('Use structured data markup to enhance knowledge graph connections.', 'xoptymiz'),
            __('Regular content updates help maintain high confidence scores.', 'xoptymiz'),
            __('Consider adding related internal links to strengthen entity relationships.', 'xoptymiz')
        );
        
        echo '<ul class="xoptymiz-tips-list">';
        foreach (array_slice($tips, 0, 3) as $tip) {
            echo '<li>💡 ' . esc_html($tip) . '</li>';
        }
        echo '</ul>';
    }
    
    private function check_database_tables() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'xoptymiz_processed_content';
        return $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    }
    
    private function is_llms_txt_accessible() {
        $response = wp_remote_head(home_url('/llms.txt'));
        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
    }
}

?>