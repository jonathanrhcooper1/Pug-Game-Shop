<?php
/**
 * Theme bootstrap for The Pug Arcade Commerce.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PUG_ARCADE_VERSION', '1.0.0');
define('PUG_ARCADE_DIR', get_template_directory());
define('PUG_ARCADE_URI', get_template_directory_uri());

function pug_arcade_secure_site_url($url)
{
    $url = (string) $url;

    if ('' === $url || !function_exists('wp_parse_url')) {
        return $url;
    }

    $host = wp_parse_url($url, PHP_URL_HOST);
    $should_force_https = is_ssl() || 'j84.285.myftpupload.com' === $host;

    if ($should_force_https && 0 === strpos($url, 'http://')) {
        return 'https://' . substr($url, 7);
    }

    return $url;
}

add_filter('home_url', 'pug_arcade_secure_site_url', 20);
add_filter('site_url', 'pug_arcade_secure_site_url', 20);

function pug_arcade_secure_nav_menu_link($atts)
{
    if (is_array($atts) && isset($atts['href'])) {
        $atts['href'] = pug_arcade_secure_site_url((string) $atts['href']);
    }

    return $atts;
}
add_filter('nav_menu_link_attributes', 'pug_arcade_secure_nav_menu_link', 20);

function pug_arcade_asset_version($path)
{
    $file = PUG_ARCADE_DIR . $path;
    return file_exists($file) ? (string) filemtime($file) : PUG_ARCADE_VERSION;
}

function pug_arcade_setup()
{
    load_theme_textdomain('pug-arcade', PUG_ARCADE_DIR . '/languages');

    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array(
        'height'      => 180,
        'width'       => 320,
        'flex-height' => true,
        'flex-width'  => true,
    ));
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('align-wide');
    add_theme_support('responsive-embeds');
    add_theme_support('editor-styles');
    add_editor_style('assets/css/editor.css');

    add_theme_support('woocommerce');
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');

    register_nav_menus(array(
        'primary' => __('Primary Menu', 'pug-arcade'),
        'footer'  => __('Footer Menu', 'pug-arcade'),
    ));
}
add_action('after_setup_theme', 'pug_arcade_setup');

function pug_arcade_widgets_init()
{
    register_sidebar(array(
        'name'          => __('Shop Sidebar', 'pug-arcade'),
        'id'            => 'shop-sidebar',
        'description'   => __('Filters and widgets for the shop archive.', 'pug-arcade'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
}
add_action('widgets_init', 'pug_arcade_widgets_init');

function pug_arcade_enqueue_assets()
{
    wp_enqueue_style('pug-arcade-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap', array(), null);
    wp_enqueue_style('pug-arcade-main', PUG_ARCADE_URI . '/assets/css/main.css', array(), pug_arcade_asset_version('/assets/css/main.css'));
    wp_enqueue_script('pug-arcade-main', PUG_ARCADE_URI . '/assets/js/main.js', array(), pug_arcade_asset_version('/assets/js/main.js'), true);

    wp_localize_script('pug-arcade-main', 'pugArcade', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'themeUrl' => PUG_ARCADE_URI,
    ));
}
add_action('wp_enqueue_scripts', 'pug_arcade_enqueue_assets');

function pug_arcade_handle_contact_form()
{
    if ('POST' !== $_SERVER['REQUEST_METHOD'] || empty($_POST['pug_contact_form'])) {
        return;
    }

    if (empty($_POST['pug_contact_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['pug_contact_nonce'])), 'pug_contact_form')) {
        wp_safe_redirect(add_query_arg('pug-contact', 'error', wp_get_referer() ?: home_url('/contact/')));
        exit;
    }

    $name = isset($_POST['pug_name']) ? sanitize_text_field(wp_unslash($_POST['pug_name'])) : '';
    $email = isset($_POST['pug_email']) ? sanitize_email(wp_unslash($_POST['pug_email'])) : '';
    $topic = isset($_POST['pug_topic']) ? sanitize_text_field(wp_unslash($_POST['pug_topic'])) : '';
    $message = isset($_POST['pug_message']) ? sanitize_textarea_field(wp_unslash($_POST['pug_message'])) : '';

    if (!$name || !$email || !$message || !is_email($email)) {
        wp_safe_redirect(add_query_arg('pug-contact', 'error', wp_get_referer() ?: home_url('/contact/')));
        exit;
    }

    $to = get_option('admin_email');
    $subject = sprintf('The Pug contact: %s', $topic ?: 'Shop message');
    $body = sprintf(
        "Name: %s\nEmail: %s\nTopic: %s\n\nMessage:\n%s",
        $name,
        $email,
        $topic ?: 'General',
        $message
    );
    $headers = array('Reply-To: ' . $name . ' <' . $email . '>');

    $sent = wp_mail($to, $subject, $body, $headers);
    wp_safe_redirect(add_query_arg('pug-contact', $sent ? 'sent' : 'error', home_url('/contact/')));
    exit;
}
add_action('template_redirect', 'pug_arcade_handle_contact_form', 0);

function pug_arcade_body_classes($classes)
{
    $classes[] = 'pug-arcade-theme';
    return $classes;
}
add_filter('body_class', 'pug_arcade_body_classes');

function pug_arcade_cart_count()
{
    if (function_exists('WC') && WC()->cart) {
        return (int) WC()->cart->get_cart_contents_count();
    }

    return 0;
}

function pug_arcade_shop_url()
{
    if (function_exists('wc_get_page_permalink')) {
        return wc_get_page_permalink('shop');
    }

    return home_url('/shop/');
}

function pug_arcade_page_url($slug)
{
    return home_url('/' . trim(sanitize_title($slug), '/') . '/');
}

function pug_arcade_singles_game_url($game)
{
    return add_query_arg(
        array('tcg_inventory_game' => sanitize_key($game)),
        pug_arcade_page_url('shop-singles')
    );
}

function pug_arcade_category_url($slug)
{
    if (taxonomy_exists('product_cat')) {
        $term = get_term_by('slug', $slug, 'product_cat');
        if ($term && !is_wp_error($term)) {
            return get_term_link($term);
        }
    }

    return home_url('/product-category/' . sanitize_title($slug) . '/');
}

function pug_arcade_seed_pages()
{
    $pages = array(
        'shop-singles' => array(
            'title' => 'Shop Singles',
            'body'  => '<!-- wp:heading --><h2>Shop Singles</h2><!-- /wp:heading --><!-- wp:shortcode -->[tcg_inventory_search limit="24"]<!-- /wp:shortcode -->',
        ),
        'buying' => array(
            'title' => 'Buying',
            'body'  => '<!-- wp:heading --><h2>Buying at The PUG</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Bring in your extra or unwanted cards. We buy and trade on singles and sealed products with competitive payouts based on current market value.</p><!-- /wp:paragraph -->',
        ),
        'events' => array(
            'title' => 'Events',
            'body'  => '<!-- wp:heading --><h2>Events at The PUG</h2><!-- /wp:heading --><!-- wp:shortcode -->[tcg_events limit="12"]<!-- /wp:shortcode -->',
        ),
        'contact' => array(
            'title' => 'Contact',
            'body'  => '<!-- wp:paragraph --><p>Questions about products, events, preorders, or selling a collection? Reach out and the shop team will help.</p><!-- /wp:paragraph -->',
        ),
    );

    foreach ($pages as $slug => $page) {
        $existing = get_page_by_path($slug);
        if (!$existing) {
            wp_insert_post(array(
                'post_title'   => $page['title'],
                'post_name'    => $slug,
                'post_status'  => 'publish',
                'post_type'    => 'page',
                'post_content' => $page['body'],
            ));
        }
    }

    if (taxonomy_exists('product_cat')) {
        $categories = array(
            'singles' => 'Singles',
            'sealed-products' => 'Sealed Products',
            'accessories' => 'Accessories',
            'magic-the-gathering' => 'Magic: The Gathering',
            'pokemon' => 'Pokemon',
            'lorcana' => 'Lorcana',
            'riftbound' => 'Riftbound',
            'one-piece' => 'One Piece',
            'gundam' => 'Gundam',
        );

        foreach ($categories as $slug => $name) {
            if (!term_exists($slug, 'product_cat')) {
                wp_insert_term($name, 'product_cat', array('slug' => $slug));
            }
        }
    }
}
add_action('after_switch_theme', 'pug_arcade_seed_pages');

function pug_arcade_wc_wrapper_start()
{
    echo '<main id="main" class="site-main pug-shop-main"><section class="shop-shell">';
}

function pug_arcade_wc_wrapper_end()
{
    echo '</section></main>';
}

remove_action('woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10);
remove_action('woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10);
add_action('woocommerce_before_main_content', 'pug_arcade_wc_wrapper_start', 10);
add_action('woocommerce_after_main_content', 'pug_arcade_wc_wrapper_end', 10);

function pug_arcade_woocommerce_breadcrumb_defaults($defaults)
{
    $defaults['delimiter'] = '<span class="breadcrumb-delimiter">/</span>';
    $defaults['wrap_before'] = '<nav class="woocommerce-breadcrumb pug-breadcrumb" aria-label="Breadcrumb">';
    $defaults['wrap_after'] = '</nav>';
    return $defaults;
}
add_filter('woocommerce_breadcrumb_defaults', 'pug_arcade_woocommerce_breadcrumb_defaults');
