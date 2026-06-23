<?php
/**
 * Front page for The Pug.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$featured_products = array();
if (function_exists('wc_get_products')) {
    $featured_products = wc_get_products(array(
        'status' => 'publish',
        'limit'  => 4,
        'orderby' => 'date',
        'order' => 'DESC',
    ));
}

$categories = array(
    array('name' => 'MTG', 'game' => 'magicthegathering', 'tag' => 'Commander, sealed, singles', 'color' => 'cyan'),
    array('name' => 'Pokemon', 'game' => 'pokemon', 'tag' => 'Boosters, boxes, collections', 'color' => 'gold'),
    array('name' => 'Lorcana', 'game' => 'lorcana', 'tag' => 'Illumineer staples', 'color' => 'pink'),
    array('name' => 'Riftbound', 'game' => 'riftbound', 'tag' => 'Nexus nights and drops', 'color' => 'blue'),
);
?>

<main id="main" class="site-main">
    <section class="hero-stage" style="--hero-image: url('<?php echo esc_url(PUG_ARCADE_URI . '/assets/img/pug-hero-arcade.png'); ?>');">
        <div class="hero-overlay-grid" aria-hidden="true"></div>
        <div class="hero-content">
            <div class="hero-copy">
                <img src="<?php echo esc_url(PUG_ARCADE_URI . '/assets/img/pug-logo.webp'); ?>" alt="The Pug Cards, Games and More" class="hero-logo">
                <h1>Pull rare. Play loud. Shop The Pug.</h1>
                <p>Sealed product, singles, dice, accessories, prereleases, locals, and trade-ins for TCG players who want the shop to feel like game night.</p>
                <div class="hero-actions">
                    <a class="btn btn-primary magnet" href="<?php echo esc_url(pug_arcade_page_url('shop-singles')); ?>">Shop Singles</a>
                    <a class="btn btn-ghost magnet" href="<?php echo esc_url(home_url('/events/')); ?>">View Events</a>
                </div>
                <div class="signal-row" aria-label="Store highlights">
                    <span><strong>4+</strong> game lines</span>
                    <span><strong>Fast</strong> buylist quotes</span>
                    <span><strong>Weekly</strong> play nights</span>
                </div>
            </div>

            <div class="arcade-panel tilt-card" data-tilt>
                <div class="panel-header">
                    <span class="panel-light"></span>
                    <span class="panel-title">Live Shop Loadout</span>
                    <span class="panel-status">Online</span>
                </div>
                <div class="loadout-stack">
                    <?php foreach ($categories as $index => $category) : ?>
                        <a class="loadout-card loadout-<?php echo esc_attr($category['color']); ?>" href="<?php echo esc_url(pug_arcade_singles_game_url($category['game'])); ?>" style="--i: <?php echo esc_attr($index); ?>">
                            <span><?php echo esc_html($category['name']); ?></span>
                            <small><?php echo esc_html($category['tag']); ?></small>
                        </a>
                    <?php endforeach; ?>
                </div>
                <div class="scanline"></div>
            </div>
        </div>
    </section>

    <section class="ticker-band" aria-label="Shop updates">
        <div class="ticker-track">
            <span>Preorders</span><span>Singles</span><span>Sealed Boxes</span><span>Trade-Ins</span><span>Commander Night</span><span>Riftbound Fridays</span><span>Pokemon</span><span>Lorcana</span>
            <span>Preorders</span><span>Singles</span><span>Sealed Boxes</span><span>Trade-Ins</span><span>Commander Night</span><span>Riftbound Fridays</span><span>Pokemon</span><span>Lorcana</span>
        </div>
    </section>

    <section class="section product-arena">
        <div class="section-head">
            <div>
                <h2>Fresh From The Case</h2>
                <p>New arrivals, preorder heat, and the staples players keep asking for.</p>
            </div>
            <a class="link-arrow" href="<?php echo esc_url(pug_arcade_page_url('shop-singles')); ?>">Browse singles</a>
        </div>

        <?php if (!empty($featured_products)) : ?>
            <div class="product-grid">
                <?php foreach ($featured_products as $product) : ?>
                    <article class="shop-card tilt-card" data-tilt>
                        <a href="<?php echo esc_url(get_permalink($product->get_id())); ?>" class="shop-card-image">
                            <?php echo $product->get_image('woocommerce_thumbnail'); ?>
                            <?php if ($product->is_on_sale()) : ?>
                                <span class="product-badge">Sale</span>
                            <?php endif; ?>
                        </a>
                        <div class="shop-card-body">
                            <h3><a href="<?php echo esc_url(get_permalink($product->get_id())); ?>"><?php echo esc_html($product->get_name()); ?></a></h3>
                            <div class="price-row"><?php echo wp_kses_post($product->get_price_html()); ?></div>
                            <a class="mini-buy" href="<?php echo esc_url($product->add_to_cart_url()); ?>" data-quantity="1" data-product_id="<?php echo esc_attr($product->get_id()); ?>">
                                <?php echo esc_html($product->add_to_cart_text()); ?>
                            </a>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <div class="placeholder-grid">
                <?php
                $placeholders = array(
                    'Magic: The Gathering - Preorders',
                    'Pokemon Booster Drops',
                    'Lorcana League Picks',
                    'Riftbound Nexus Night Kits',
                );
                foreach ($placeholders as $index => $placeholder) :
                    ?>
                    <article class="shop-card placeholder-card tilt-card" data-tilt>
                        <div class="placeholder-art"><span><?php echo esc_html(str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)); ?></span></div>
                        <div class="shop-card-body">
                            <h3><?php echo esc_html($placeholder); ?></h3>
                            <p>Inventory is being loaded into WooCommerce.</p>
                            <a class="mini-buy" href="<?php echo esc_url(home_url('/contact/')); ?>">Ask the shop</a>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </section>

    <section class="section category-runway">
        <div class="section-head">
            <div>
                <h2>Choose Your Table</h2>
                <p>Jump straight into the game line you collect, play, or trade.</p>
            </div>
        </div>
        <div class="category-grid">
            <?php foreach ($categories as $category) : ?>
                <a class="category-tile category-<?php echo esc_attr($category['color']); ?>" href="<?php echo esc_url(pug_arcade_singles_game_url($category['game'])); ?>">
                    <span><?php echo esc_html($category['name']); ?></span>
                    <small><?php echo esc_html($category['tag']); ?></small>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
                </a>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="split-section event-lab">
        <div class="event-copy">
            <h2>Events That Feel Like Launch Night</h2>
            <p>Weekly play keeps the shop moving: Commander on Tuesdays and Thursdays, Riftbound Nexus Nights and Pokemon on Fridays, plus Saturday locals for Gundam, One Piece, and Digimon.</p>
            <a class="btn btn-primary magnet" href="<?php echo esc_url(home_url('/events/')); ?>">See Calendar</a>
        </div>
        <div class="event-board">
            <div class="event-row"><span>Tue</span><strong>Commander Night</strong><em>Casual pods</em></div>
            <div class="event-row"><span>Thu</span><strong>Commander Night</strong><em>Midweek table time</em></div>
            <div class="event-row"><span>Fri</span><strong>Riftbound + Pokemon</strong><em>Nexus and trainer nights</em></div>
            <div class="event-row"><span>Sat</span><strong>Locals</strong><em>Gundam, One Piece, Digimon</em></div>
        </div>
    </section>

    <section class="section buylist-zone">
        <div class="buylist-card">
            <div>
                <h2>Turn Extra Cards Into Store Credit</h2>
                <p>Bring singles or sealed product to the counter. The team checks market value, gives a clear quote, and keeps the process fast, fair, and straightforward.</p>
            </div>
            <div class="steps">
                <span>Bring cards</span>
                <span>Get quote</span>
                <span>Trade up</span>
            </div>
            <a class="btn btn-ghost magnet" href="<?php echo esc_url(home_url('/buying/')); ?>">Start Selling</a>
        </div>
    </section>

    <section class="section visit-strip">
        <h2>Ready For The Next Pull?</h2>
        <p>Shop online, check event nights, or message the team about preorders and collections.</p>
        <div class="hero-actions">
            <a class="btn btn-primary magnet" href="<?php echo esc_url(pug_arcade_shop_url()); ?>">Enter Shop</a>
            <a class="btn btn-ghost magnet" href="<?php echo esc_url(home_url('/contact/')); ?>">Contact The Pug</a>
        </div>
    </section>
</main>

<?php
get_footer();
