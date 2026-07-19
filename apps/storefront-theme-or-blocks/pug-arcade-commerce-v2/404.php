<?php
/**
 * 404 template.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="main" class="site-main content-shell">
    <section class="content-card not-found-card">
        <h1><?php esc_html_e('This card is not in the binder.', 'pug-arcade'); ?></h1>
        <p><?php esc_html_e('The page you wanted could not be found. Try the shop, events, or contact page.', 'pug-arcade'); ?></p>
        <div class="hero-actions">
            <a class="btn btn-primary" href="<?php echo esc_url(pug_arcade_shop_url()); ?>"><?php esc_html_e('Shop Products', 'pug-arcade'); ?></a>
            <a class="btn btn-ghost" href="<?php echo esc_url(home_url('/events/')); ?>"><?php esc_html_e('View Events', 'pug-arcade'); ?></a>
        </div>
    </section>
</main>
<?php
get_footer();

