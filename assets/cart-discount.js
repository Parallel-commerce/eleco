if (!customElements.get('cart-discount')) {
  class CartDiscount extends HTMLElement {
  constructor() {
    super();
    this.activeFetch = null;

    this.form = this.querySelector('form');
    this.input = this.querySelector('input[name="discount"]');
    this.submitButton = this.querySelector('[type="submit"]');
    this.error = this.querySelector('.cart-discount__error');
    this.errorText = this.querySelector('.cart-discount__error-text');

    this.form.addEventListener('submit', this.applyDiscount.bind(this));
    this.querySelectorAll('[data-remove-discount]').forEach((button) => {
      button.addEventListener('click', this.removeDiscount.bind(this));
    });
  }

  disconnectedCallback() {
    if (this.activeFetch) this.activeFetch.abort();
  }

  getSectionsToRender() {
    const sections = [];

    if (document.getElementById('CartDrawer')) {
      sections.push({
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      });
    }

    const cartItems = document.getElementById('main-cart-items');
    if (cartItems) {
      sections.push({
        id: 'main-cart-items',
        section: cartItems.dataset.id,
        selector: '.js-contents',
      });
    }

    const cartFooter = document.getElementById('main-cart-footer');
    if (cartFooter) {
      sections.push({
        id: 'main-cart-footer',
        section: cartFooter.dataset.id,
        selector: '.js-contents',
      });
    }

    return sections;
  }

  existingDiscounts() {
    return Array.from(this.querySelectorAll('.cart-discount__pill'))
      .map((pill) => pill.dataset.discountCode)
      .filter(Boolean);
  }

  codesMatch(first, second) {
    return first.trim().toUpperCase() === second.trim().toUpperCase();
  }

  async applyDiscount(event) {
    event.preventDefault();
    event.stopPropagation();

    const code = this.input.value.trim();
    if (!code) return;

    const existingDiscounts = this.existingDiscounts();
    if (existingDiscounts.some((applied) => this.codesMatch(applied, code))) {
      this.input.value = '';
      return;
    }

    this.setError();
    this.toggleLoading(true);

    try {
      const cart = await this.updateDiscounts([...existingDiscounts, code]);
      const submitted = cart.discount_codes?.find((discount) => this.codesMatch(discount.code, code));

      if (!submitted || submitted.applicable === false) {
        this.setError(window.cartStrings.discountError);
        return;
      }

      this.renderSections(cart);
      publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cartData: cart });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      this.setError(window.cartStrings.error);
    } finally {
      this.toggleLoading(false);
    }
  }

  async removeDiscount(event) {
    event.preventDefault();
    event.stopPropagation();

    const pill = event.currentTarget.closest('.cart-discount__pill');
    const code = pill?.dataset.discountCode;
    if (!code) return;

    const remaining = this.existingDiscounts().filter((applied) => !this.codesMatch(applied, code));

    this.setError();
    this.toggleLoading(true);

    try {
      const cart = await this.updateDiscounts(remaining);
      this.renderSections(cart);
      publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-discount', cartData: cart });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      this.setError(window.cartStrings.error);
    } finally {
      this.toggleLoading(false);
    }
  }

  updateDiscounts(codes) {
    if (this.activeFetch) this.activeFetch.abort();
    this.activeFetch = new AbortController();

    const body = JSON.stringify({
      discount: codes.join(','),
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    return fetch(`${routes.cart_update_url}`, {
      ...fetchConfig(),
      body,
      signal: this.activeFetch.signal,
    }).then((response) => response.json());
  }

  renderSections(cart) {
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = document.getElementById(section.id);
      if (!sectionElement || !cart.sections?.[section.section]) return;

      const elementToReplace = sectionElement.querySelector(section.selector) || sectionElement;
      const html = this.getSectionInnerHTML(cart.sections[section.section], section.selector);
      if (html !== null) elementToReplace.innerHTML = html;
    });

    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const cartFooter = document.getElementById('main-cart-footer');

    if (cartFooter) cartFooter.classList.toggle('is-empty', cart.item_count === 0);
    if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', cart.item_count === 0);
  }

  getSectionInnerHTML(html, selector) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.querySelector(selector)?.innerHTML ?? null;
  }

  setError(message) {
    if (!this.error || !this.errorText) return;

    if (message) {
      this.errorText.textContent = message;
      this.error.classList.remove('hidden');
      this.input.setAttribute('aria-invalid', 'true');
      if (this.error.id) this.input.setAttribute('aria-describedby', this.error.id);
    } else {
      this.errorText.textContent = '';
      this.error.classList.add('hidden');
      this.input.removeAttribute('aria-invalid');
      this.input.removeAttribute('aria-describedby');
    }
  }

  toggleLoading(isLoading) {
    this.classList.toggle('cart-discount--loading', isLoading);
    if (this.submitButton) this.submitButton.disabled = isLoading;
    if (this.input) this.input.disabled = isLoading;
    this.querySelectorAll('[data-remove-discount]').forEach((button) => {
      button.disabled = isLoading;
    });
  }
}

  customElements.define('cart-discount', CartDiscount);
}
