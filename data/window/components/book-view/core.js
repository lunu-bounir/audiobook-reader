/* global Sortable */

class BookView extends HTMLElement {
  static version = '0.1.0';

  #counter = 0;
  #sortable;

  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: 'open'
    });
    shadow.innerHTML = `
      <style>
        :host {}

        h3 {
          margin: 0;
          display: inline;
        }
        li {
          padding: var(--gap, 5px) 0;
        }
        summary {
          display: grid;
          grid-template-columns: min-content 1fr min-content;
          grid-gap: var(--gap, 5px);
          align-items: center;
          white-space: nowrap;
          cursor: pointer;
          padding: calc(var(--gap, 5px) * 2) 0;
        }
        #percent {
          font-size: 80%;
        }
        .item {
          display: grid;
          grid-template-columns: 2ch 1fr min-content min-content;
          grid-gap: var(--gap, 5px);
          align-items: center;
        }
        .handle {
          background: url('images/handle.svg') left center no-repeat;
          background-size: 1.5ch;
          cursor: ns-resize;
          aspect-ratio: 1/1;
        }
        #items {
          list-style: none;
          margin: 0;
          padding: 0 calc(var(--gap, 5px) * 2);
          padding-bottom: var(--gap, 5px);
        }
        #items:empty:before {
          content: 'Empty List';
          font-style: italic;
          font-size: 80%;
          padding: var(--gap, 5px);
          display: block;
        }
        span[data-id="duration"] {
          font-family: monospace;
        }
        #counter {
          margin-right: var(--gap, 5px);
        }

        @media (prefers-color-scheme: dark) {
          .handle {
            filter: invert(1);
          }
        }
      </style>
      <details>
        <summary>
          <h3>Book Title</h3>
          <span id="percent">0.0%</span>
          <span>Files <span id="counter">-</span></span>
        </summary>
        <template id="item">
          <li>
            <label class="item">
              <span class="handle"></span>
              <span data-id="name">Item 1</span>
              <input type="checkbox">
              <span data-id="duration">00:00:00</span>
            </label>
          </li>
        </template>
        <ul id="items"></ul>
      </details>
    `;
  }
  connectedCallback() {
    this.shadowRoot.querySelector('details').addEventListener('toggle', e => {
      if (e.target.open) {
        this.onopen();
      }
    });

    this.shadowRoot.addEventListener('click', () => {
      this.click();
    });
    this.shadowRoot.addEventListener('change', () => {
      const size = this.shadowRoot.querySelectorAll('input[type=checkbox]:checked').length;
      if (size) {
        this.dataset.selected = size;
      }
      else {
        delete this.dataset.selected;
      }
      this.dispatchEvent(new Event('change', {
        bubbles: true
      }));
    });

    this.#sortable = Sortable.create(this.shadowRoot.getElementById('items'), {
      handle: '.handle',
      draggable: 'li',
      animation: 150,
      direction: 'vertical',
      dataIdAttr: 'id',
      onSort: () => {
        const names = this.#sortable.toArray();
        this.onsort(names);
      }
    });
  }
  name(name) {
    this.shadowRoot.querySelector('h3').textContent = name;
  }
  #convert(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    // Pad the values with leading zeros if necessary
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = Math.round(remainingSeconds).toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  file(name, duration) {
    if (this.shadowRoot.getElementById(name)) {
      return;
    }

    const t = this.shadowRoot.getElementById('item');
    this.#counter += 1;
    const clone = document.importNode(t.content, true);
    clone.querySelector('[data-id=name]').textContent = name;
    clone.querySelector('[data-id=duration]').textContent = this.#convert(duration);
    clone.querySelector('li').id = name;

    this.shadowRoot.getElementById('items').append(clone);
    this.shadowRoot.getElementById('counter').textContent = this.#counter;
  }
  names(selected = false) {
    const query = selected ? 'input[type=checkbox]:checked' : 'input[type=checkbox]';
    return [...this.shadowRoot.querySelectorAll(query)].map(e => {
      return e.closest('li').id;
    });
  }
  remove(name) {
    const e = this.shadowRoot.getElementById(name);
    if (e) {
      e.remove();
      this.#counter -= 1;
    }
    if (this.#counter === 0) {
      this.shadowRoot.getElementById('items').textContent = '';
    }
    this.shadowRoot.getElementById('counter').textContent = this.#counter;
  }
  sort(names) {
    this.#sortable.sort(names);
  }
  open() {
    this.shadowRoot.querySelector('details').open = true;
  }
  /* events */
  onopen() {}
  onsort() {}
}
customElements.define('book-view', BookView);
