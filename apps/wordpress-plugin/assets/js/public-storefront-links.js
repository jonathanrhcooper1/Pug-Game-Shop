(function () {
	'use strict';

	var shelves = [
		{ label: 'Singles', href: '/shop-singles/' },
		{ label: 'Sealed', href: '/shop-sealed-products/' },
		{ label: 'Graded', href: '/shop-graded-cards/' },
		{ label: 'Accessories', href: '/shop-accessories/' }
	];

	function absoluteUrl(path) {
		return new URL(path, window.location.origin).href;
	}

	function rewriteFooterShopLinks() {
		var footer = document.querySelector('footer, [role="contentinfo"], .site-footer');

		if (!footer) {
			return;
		}

		var heading = Array.prototype.find.call(footer.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (node) {
			return (node.textContent || '').trim().toLowerCase() === 'shop';
		});

		var scope = heading && heading.parentElement ? heading.parentElement : footer;
		var links = Array.prototype.slice.call(scope.querySelectorAll('a[href]'));

		if (!links.length) {
			return;
		}

		links.slice(0, shelves.length).forEach(function (link, index) {
			var shelf = shelves[index];
			link.textContent = shelf.label;
			link.href = absoluteUrl(shelf.href);
			link.setAttribute('aria-label', shelf.label);
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', rewriteFooterShopLinks);
		return;
	}

	rewriteFooterShopLinks();
})();
