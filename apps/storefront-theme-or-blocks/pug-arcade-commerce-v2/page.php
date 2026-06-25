<?php
/**
 * Page template.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="main" class="site-main content-shell">
    <?php while (have_posts()) : the_post(); ?>
        <article <?php post_class('content-card page-card'); ?>>
            <h1><?php the_title(); ?></h1>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        </article>
    <?php endwhile; ?>
</main>
<?php
get_footer();

