<?php
/**
 * Site header.
 */

if (!defined('ABSPATH')) {
    exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#main"><?php esc_html_e('Skip to content', 'pug-arcade'); ?></a>

<header class="site-header" data-site-header>
    <div class="header-inner">
        <a class="brand-lockup" href="<?php echo esc_url(home_url('/')); ?>" aria-label="<?php bloginfo('name'); ?>">
            <img src="<?php echo esc_url(PUG_ARCADE_URI . '/assets/img/pug-logo.webp'); ?>" alt="The Pug Cards, Games and More" class="brand-logo">
            <span class="brand-text">The Pug</span>
        </a>

        <button class="nav-toggle" type="button" aria-label="<?php esc_attr_e('Open menu', 'pug-arcade'); ?>" aria-expanded="false" data-nav-toggle>
            <span></span><span></span><span></span>
        </button>

        <nav class="primary-nav" aria-label="<?php esc_attr_e('Primary menu', 'pug-arcade'); ?>" data-primary-nav>
            <?php
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'container'      => false,
                'fallback_cb'    => 'pug_arcade_default_menu',
                'menu_class'     => 'menu',
                'depth'          => 2,
            ));
            ?>
        </nav>

        <div class="header-actions">
            <a class="icon-action search-action" href="<?php echo esc_url(home_url('/?s=')); ?>" aria-label="<?php esc_attr_e('Search products', 'pug-arcade'); ?>">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg>
            </a>
            <a class="cart-pill" href="<?php echo esc_url(function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/')); ?>">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7h13l-1.4 8.4a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.8 4H3"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
                <span><?php esc_html_e('Cart', 'pug-arcade'); ?></span>
                <strong><?php echo esc_html(pug_arcade_cart_count()); ?></strong>
            </a>
        </div>
    </div>
</header>

<?php
function pug_arcade_default_menu()
{
    $items = array(
        array('label' => 'Singles', 'url' => pug_arcade_page_url('shop-singles')),
        array('label' => 'Buying', 'url' => home_url('/buying/')),
        array('label' => 'Events', 'url' => home_url('/events/')),
        array('label' => 'Contact', 'url' => home_url('/contact/')),
    );

    echo '<ul class="menu">';
    foreach ($items as $item) {
        printf('<li><a href="%s">%s</a></li>', esc_url($item['url']), esc_html($item['label']));
    }
    echo '</ul>';
}
