<?php
/**
 * Custom contact page.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$contact_status = isset($_GET['pug-contact']) ? sanitize_key(wp_unslash($_GET['pug-contact'])) : '';
?>

<main id="main" class="site-main content-shell contact-page">
    <section class="contact-hero">
        <div class="contact-panel">
            <div>
                <h1>Contact The Pug</h1>
                <p>Questions about sealed drops, singles, preorders, events, or selling a collection? Send the shop team the details and we will help you get pointed in the right direction.</p>
                <div class="contact-pills" aria-label="Contact topics">
                    <span>Preorders</span>
                    <span>Events</span>
                    <span>Buylist</span>
                    <span>Product Holds</span>
                </div>
            </div>

            <div class="contact-quick-grid">
                <div class="contact-quick-card">
                    <span>Fast Questions</span>
                    <small>Product availability, pickup timing, event seats, and sealed drop updates.</small>
                </div>
                <div class="contact-quick-card">
                    <span>Selling Cards</span>
                    <small>Tell us what you have before bringing in singles or sealed product.</small>
                </div>
                <div class="contact-quick-card contact-location-card">
                    <span>Visit The Pug</span>
                    <address>
                        The Pug Cards, Games &amp; More<br>
                        513 Wears Valley Rd Suite #9.75<br>
                        Pigeon Forge, TN 37862
                    </address>
                    <a href="tel:+18657740712">(865) 774-0712</a>
                    <a class="contact-directions-link" href="https://www.google.com/maps/search/?api=1&amp;query=513%20Wears%20Valley%20Rd%20Suite%209.75%20Pigeon%20Forge%20TN%2037862" target="_blank" rel="noopener">Get Directions</a>
                </div>
            </div>
        </div>

        <aside class="contact-form-card" aria-label="Contact form">
            <h2>Send A Message</h2>
            <p>Include game line, product name, or event date when it matters.</p>

            <?php if ('sent' === $contact_status) : ?>
                <div class="contact-alert success">Message sent. The shop team will review it shortly.</div>
            <?php elseif ('error' === $contact_status) : ?>
                <div class="contact-alert error">Something was missing. Check your email and message, then try again.</div>
            <?php endif; ?>

            <form class="pug-contact-form" method="post" action="<?php echo esc_url(home_url('/contact/')); ?>">
                <?php wp_nonce_field('pug_contact_form', 'pug_contact_nonce'); ?>
                <input type="hidden" name="pug_contact_form" value="1">

                <label>
                    Name
                    <input type="text" name="pug_name" autocomplete="name" required>
                </label>

                <label>
                    Email
                    <input type="email" name="pug_email" autocomplete="email" required>
                </label>

                <label>
                    Topic
                    <select name="pug_topic">
                        <option value="Product question">Product question</option>
                        <option value="Preorder">Preorder</option>
                        <option value="Event">Event</option>
                        <option value="Selling cards">Selling cards</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                <label>
                    Message
                    <textarea name="pug_message" required></textarea>
                </label>

                <button class="btn btn-primary magnet" type="submit">Send Message</button>
            </form>
        </aside>
    </section>
</main>

<?php
get_footer();
