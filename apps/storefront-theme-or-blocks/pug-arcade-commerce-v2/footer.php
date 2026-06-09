<?php
/**
 * Site footer.
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<footer class="site-footer">
    <div class="footer-grid">
        <div>
            <img src="<?php echo esc_url(PUG_ARCADE_URI . '/assets/img/pug-logo.webp'); ?>" alt="The Pug Cards, Games and More" class="footer-logo">
            <p>Cards, games, sealed product, singles, trades, events, and a shop floor built for great pulls.</p>
        </div>
        <div>
            <h2>Shop</h2>
            <a href="<?php echo esc_url(pug_arcade_page_url('shop-singles')); ?>">Singles</a>
            <a href="<?php echo esc_url(pug_arcade_page_url('shop-sealed-products')); ?>">Sealed products</a>
            <a href="<?php echo esc_url(pug_arcade_page_url('shop-accessories')); ?>">Accessories</a>
            <a href="<?php echo esc_url(pug_arcade_shop_url()); ?>">All products</a>
        </div>
        <div>
            <h2>Play</h2>
            <a href="<?php echo esc_url(home_url('/events/')); ?>">Event calendar</a>
            <a href="<?php echo esc_url(home_url('/buying/')); ?>">Sell your cards</a>
            <a href="<?php echo esc_url(home_url('/contact/')); ?>">Contact the shop</a>
        </div>
        <div>
            <h2>Stay Ready</h2>
            <form class="footer-signup" action="<?php echo esc_url(home_url('/')); ?>" method="get">
                <label class="screen-reader-text" for="footer-email">Email</label>
                <input id="footer-email" type="email" name="email" placeholder="Email for drops">
                <button type="submit">Join</button>
            </form>
        </div>
    </div>
    <div class="footer-bottom">
        <span>&copy; <?php echo esc_html(date('Y')); ?> The Pug Cards, Games &amp; More.</span>
        <span>Powered by WooCommerce.</span>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
