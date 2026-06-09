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

	function isShopLink(link) {
		var url;

		try {
			url = new URL(link.href, window.location.origin);
		} catch (error) {
			return false;
		}

		return '/shop' === url.pathname.replace(/\/$/, '') || 'shop' === (link.textContent || '').trim().toLowerCase();
	}

	function hasShelfLink(scope, href) {
		return Boolean(
			Array.prototype.find.call(scope.querySelectorAll('a[href]'), function (link) {
				return link.href === absoluteUrl(href);
			})
		);
	}

	function makeShelfLink(sourceLink, shelf) {
		var link = document.createElement('a');
		link.textContent = shelf.label;
		link.href = absoluteUrl(shelf.href);
		link.setAttribute('aria-label', shelf.label);

		if (sourceLink.className) {
			link.className = sourceLink.className;
		}

		return link;
	}

	function rewriteHeaderShopLinks() {
		var headers = Array.prototype.slice.call(document.querySelectorAll('header, .site-header'));

		headers.forEach(function (header) {
			var shopLinks = Array.prototype.slice.call(header.querySelectorAll('a[href]')).filter(isShopLink);

			shopLinks.forEach(function (shopLink) {
				var scope = shopLink.parentElement || header;
				shopLink.textContent = shelves[0].label;
				shopLink.href = absoluteUrl(shelves[0].href);
				shopLink.setAttribute('aria-label', shelves[0].label);

				shelves.slice(1).reverse().forEach(function (shelf) {
					if (hasShelfLink(scope, shelf.href)) {
						return;
					}

					scope.insertBefore(makeShelfLink(shopLink, shelf), shopLink.nextSibling);
				});
			});
		});
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

	function rewriteLegacyShopLinks() {
		Array.prototype.slice.call(document.querySelectorAll('a[href]')).forEach(function (link) {
			if (!isShopLink(link)) {
				return;
			}

			link.href = absoluteUrl(shelves[0].href);

			if (/^(shop|all products|browse all|enter shop|shop drops)$/i.test((link.textContent || '').trim())) {
				link.textContent = shelves[0].label;
				link.setAttribute('aria-label', shelves[0].label);
			}
		});
	}

	function rewriteStorefrontLinks() {
		rewriteHeaderShopLinks();
		rewriteFooterShopLinks();
		rewriteLegacyShopLinks();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', rewriteStorefrontLinks);
		return;
	}

	rewriteStorefrontLinks();
})();
