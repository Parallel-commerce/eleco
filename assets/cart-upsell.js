if (!customElements.get('cart-upsell-item')) {
  customElements.define(
    'cart-upsell-item',
    class CartUpsellItem extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        const variantsScript = this.querySelector('[data-upsell-variants]');
        if (!variantsScript) return;

        this.variants = JSON.parse(variantsScript.textContent);
        this.form = this.querySelector('form');
        this.variantInput = this.querySelector('[name="id"]');
        this.priceEl = this.querySelector('[data-upsell-price]');
        this.imageEl = this.querySelector('[data-upsell-image], .cart-drawer__upsell-image');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton?.querySelector('span');

        this.addEventListener('change', this.onOptionChange.bind(this));
      }

      onOptionChange(event) {
        if (event.target.name === 'id' || event.target.name === 'quantity') return;

        const variant = this.findVariant();
        this.updateItem(variant);
      }

      getSelectedOptions() {
        return Array.from(this.querySelectorAll('[data-option-index]')).map((el) => {
          if (el.tagName === 'SELECT') return el.value;
          const checked = el.querySelector('input:checked');
          return checked ? checked.value : null;
        });
      }

      findVariant() {
        const selected = this.getSelectedOptions();
        if (!selected.length) return this.variants[0];

        return this.variants.find((variant) =>
          variant.options.every((option, index) => option === selected[index])
        );
      }

      updateItem(variant) {
        if (!variant) {
          this.variantInput.value = '';
          this.variantInput.disabled = true;
          this.submitButton.disabled = true;
          if (this.submitButtonText) this.submitButtonText.textContent = window.variantStrings.unavailable;
          return;
        }

        this.variantInput.value = variant.id;
        this.variantInput.disabled = false;
        this.submitButton.disabled = !variant.available;

        if (this.submitButtonText) {
          this.submitButtonText.textContent = variant.available
            ? window.variantStrings.addToCart
            : window.variantStrings.soldOut;
        }

        if (this.priceEl) {
          if (variant.compare_at_price) {
            this.priceEl.innerHTML = `<span class="cart-drawer__upsell-price--sale">${variant.price}</span><s class="cart-drawer__upsell-price--compare">${variant.compare_at_price}</s>`;
          } else {
            this.priceEl.innerHTML = `<span class="cart-drawer__upsell-price--regular">${variant.price}</span>`;
          }
        }

        if (this.imageEl && variant.image) {
          this.imageEl.src = variant.image;
        }
      }
    }
  );
}
