<?php
/**
 * WooCommerce template wrapper.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
woocommerce_content();
get_footer();

