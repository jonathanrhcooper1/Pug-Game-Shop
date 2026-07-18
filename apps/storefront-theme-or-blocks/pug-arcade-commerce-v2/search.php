<?php
/**
 * Search template.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="main" class="site-main content-shell">
    <section class="content-card">
        <h1><?php printf(esc_html__('Search results for %s', 'pug-arcade'), '<span>' . esc_html(get_search_query()) . '</span>'); ?></h1>
        <?php get_search_form(); ?>
    </section>
    <?php if (have_posts()) : ?>
        <div class="archive-list">
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('content-card'); ?>>
                    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                    <?php the_excerpt(); ?>
                </article>
            <?php endwhile; ?>
        </div>
        <?php the_posts_pagination(); ?>
    <?php endif; ?>
</main>
<?php
get_footer();

