(() => {
	const navToggle = document.querySelector('.nav-toggle');
	const siteNav = document.querySelector('#site-nav');
	const navLinks = Array.from(document.querySelectorAll('.site-nav .nav-link'));

	const basename = (path) => {
		const parts = String(path).split('/').filter(Boolean);
		return parts.length ? parts[parts.length - 1] : 'index.html';
	};

	const toLinkBasename = (href) => {
		try {
			const url = new URL(String(href), window.location.href);
			return basename(url.pathname);
		} catch {
			return basename(String(href));
		}
	};

	const setActiveNav = () => {
		const current = basename(window.location.pathname);
		navLinks.forEach((link) => {
			const href = link.getAttribute('href') || '';
			const linkBase = toLinkBasename(href);
			const isActive = linkBase === current;
			link.classList.toggle('is-active', isActive);
			if (isActive) {
				link.setAttribute('aria-current', 'page');
			} else {
				link.removeAttribute('aria-current');
			}
		});
	};

	if (navToggle && siteNav) {
		navToggle.addEventListener('click', () => {
			const isOpen = siteNav.classList.toggle('is-open');
			navToggle.setAttribute('aria-expanded', String(isOpen));
		});

		siteNav.addEventListener('click', (e) => {
			const target = e.target;
			if (target instanceof HTMLAnchorElement && siteNav.classList.contains('is-open')) {
				siteNav.classList.remove('is-open');
				navToggle.setAttribute('aria-expanded', 'false');
			}
		});
	}

	const earlyAccessForm = document.querySelector('#early-access-form');
	const earlyAccessStatus = document.querySelector('#early-access-status');

	if (earlyAccessForm && earlyAccessStatus) {
		earlyAccessForm.addEventListener('submit', (e) => {
			e.preventDefault();

			const name = /** @type {HTMLInputElement|null} */ (document.querySelector('#ea-name'));
			const email = /** @type {HTMLInputElement|null} */ (document.querySelector('#ea-email'));
			const country = /** @type {HTMLInputElement|null} */ (document.querySelector('#ea-country'));
			const role = /** @type {HTMLInputElement|null} */ (document.querySelector('#ea-role'));
			const language = /** @type {HTMLInputElement|null} */ (document.querySelector('#ea-language'));

			const isMissing =
				!name?.value.trim() ||
				!email?.value.trim() ||
				!country?.value.trim() ||
				!role?.value.trim() ||
				!language?.value.trim();

			if (isMissing) {
				earlyAccessStatus.textContent = 'Please fill out all fields.';
				return;
			}

			earlyAccessStatus.textContent = 'Thanks — you’re on the early access list (demo only).';
			earlyAccessForm.reset();
		});
	}

	// Initial active state.
	setActiveNav();
})();