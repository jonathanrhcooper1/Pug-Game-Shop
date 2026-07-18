<?php
/**
 * Default template.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="main" class="site-main content-shell">
    <?php if (have_posts()) : ?>
        <div class="archive-list">
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('content-card'); ?>>
                    <h1><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1>
                    <div class="entry-summary"><?php the_excerpt(); ?></div>
                </article>
            <?php endwhile; ?>
        </div>
        <?php the_posts_pagination(); ?>
    <?php else : ?>
        <article class="content-card">
            <h1><?php esc_html_e('Nothing found', 'pug-arcade'); ?></h1>
            <p><?php esc_html_e('Check back soon for new shop updates.', 'pug-arcade'); ?></p>
        </article>
    <?php endif; ?>
</main>
<?php
get_footer();

