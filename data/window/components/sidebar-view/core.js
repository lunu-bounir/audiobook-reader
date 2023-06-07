/* global Sortable */

class SidebarView extends HTMLElement {
  static version = '0.1.0';

  #sortable;
  #name;

  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: 'open'
    });
    shadow.innerHTML = `
      <style>
        :host {
          font-size: inherit;
          container: body / inline-size;
        }
        #content {
          height: 100%;
          display: grid;
          grid-template-rows: min-content 1fr min-content;
          grid-gap: var(--gap, 5px);
        }
        @container body (max-width: 10ch) {
          #content {
            display: none;
          }
        }
        header {
          display:grid;
          grid-template-columns: 1fr min-content min-content min-content;
          grid-gap: var(--gap, 5px);
          align-items: center;
          margin-bottom: calc(2 * var(--gap, 5px));
        }
        input {
          color: inherit;
        }
        input[type=button] {
          border: none;
          background-size: 100%;
          background-repeat: no-repeat;
          background-position: center center;
          background-color: transparent;
          cursor: pointer;
        }
        h2 {
          margin: var(--gap);
          font-weight: normal;
          display: inline;
        }
        #close {
          background-image: url('images/close.svg');
          width: calc(var(--button, 50px) * 0.7);
          aspect-ratio: 1/1;
        }
        #add-book:disabled,
        #add-track:disabled,
        #remove-book:disabled,
        #remove-track:disabled {
          opacity: 0.4;
        }
        #body {
          display: flex;
          gap: calc(2 * var(--gap, 5px));
          flex-direction: column;
          overflow: auto;
        }
        #body:empty:before {
          content: 'No Audiobook Yet!';
          align-items: center;
          display: flex;
          width: 100%;
          height: 100%;
          justify-content: center;
        }
        #body input[type=radio] {
          display: none;
        }
        footer {
          display: flex;
          justify-content: end;
          gap: var(--gap, 5px);
        }
        .handle {
          background: transparent url('images/handle.svg') left center no-repeat;
          background-size: 2ch;
          cursor: ns-resize ;
        }
        .item {
          display: grid;
          grid-template-columns: 3ch 1fr;
          grid-gap: var(--gap, 5px);
          position: relative;
        }
        .item:has(input[type=radio]:checked):before {
          content: '';
          position: absolute;
          inset: 0 0 0 0;
          background-color: var(--select, #d1e8ff);
          z-index: -1;
          pointer-events: none;
        }

        @media (prefers-color-scheme: dark) {
          #close,
          .handle {
            filter: invert(1);
          }
        }
      </style>
      <template id="book">
        <label class="item">
          <span class="handle"></span>
          <input type="radio" name="book">
          <book-view></book-view>
        </label>
      </template>
      <div id="content">
        <header>
          <h2>Explorer</h2>
          <input type="button" value="Add a Book" id="add-book">
          <input type="button" value="Add Tracks" id="add-track" disabled>
          <input type="button" id="close">
        </header>
        <section id="body"></section>
        <footer>
          <input type="button" value="Factory Reset" id="reset">
          <input type="button" value="Delete this Book" id="remove-book" disabled>
          <input type="button" value="Delete selected Tracks" id="remove-track" disabled>
        </footer>
      </div>
    `;
  }
  #change(name) {
    if (this.#name !== name) {
      localStorage.setItem('selected-book', name);
      this.dispatchEvent(new Event('change', {bubbles: true}));
      this.#name = name;
    }
  }
  connectedCallback() {
    this.shadowRoot.getElementById('reset').onclick = async () => {
      if (confirm('This action will reset the app to its original state, erasing all your book data permanently. Are you sure?')) {
        try {
          const root = await navigator.storage.getDirectory();
          for await (const name of root.keys()) {
            root.removeEntry(name, {recursive: true});
          }
        }
        catch (error) {
          console.error('Error emptying storage:', error);
        }
        localStorage.clear();
        location.reload();
      }
    };
    this.shadowRoot.getElementById('close').onclick = () => {
      this.dispatchEvent(new Event('close'));
    };
    this.shadowRoot.addEventListener('change', () => {
      const b = this.shadowRoot.querySelector('book-view[data-selected]');
      this.shadowRoot.getElementById('remove-track').disabled = b ? false : true;

      const book = this.#active();
      this.shadowRoot.getElementById('remove-book').disabled = book ? false : true;
      this.shadowRoot.getElementById('add-track').disabled = book ? false : true;

      if (book) {
        this.#change(book.id);
      }
    });

    this.shadowRoot.getElementById('add-book').onclick = () => {
      const name = prompt('Book Name', 'My Book');
      if (name && name.trim()) {
        this.book(name.trim(), true);
      }
    };

    this.shadowRoot.getElementById('add-track').onclick = async () => {
      const e = this.#active();
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(e.id);

      const book = e.querySelector('book-view');

      const file = document.createElement('input');
      file.type = 'file';
      file.multiple = true;
      file.accept = 'audio/*,video/*';
      file.onchange = () => {
        const files = [...file.files];
        if (files.length) {
          this.files(book, directory, files);
          this.#change(book.id);
        }
      };
      file.click();
    };

    this.shadowRoot.getElementById('remove-track').onclick = async () => {
      for (const book of this.shadowRoot.querySelectorAll('book-view[data-selected]')) {
        const names = book.names(true);
        const e = book.closest('label');
        const msg = `Are you sure you want to permanently remove the following tracks from "${e.id}"?

` + names.join('\n');

        if (confirm(msg)) {
          for (const name of names) {
            try {
              const root = await navigator.storage.getDirectory();
              const directory = await root.getDirectoryHandle(e.id);
              await directory.removeEntry(name);
              book.remove(name);
            }
            catch (e) {
              console.error(e);
              alert(e.message);
            }
          }
          this.#change(e.id);
        }
      }
    };

    this.shadowRoot.getElementById('remove-book').onclick = async () => {
      const book = this.#active();
      const p = book.previousElementSibling || book.nextElementSibling;

      if (confirm(`Are you sure you want to permanently remove "${book.id}"?`)) {
        try {
          const root = await navigator.storage.getDirectory();
          root.removeEntry(book.id, {recursive: true});
          book.remove();
          this.shadowRoot.dispatchEvent(new Event('change'));
        }
        catch (e) {
          console.error(e);
          alert(e.message);
        }
        if (p) {
          p.click();
        }
      }
    };

    this.#sortable = Sortable.create(this.shadowRoot.getElementById('body'), {
      handle: '.handle',
      draggable: '.item',
      animation: 150,
      direction: 'vertical',
      dataIdAttr: 'id',
      onSort: () => {
        const names = this.#sortable.toArray();
        localStorage.setItem('book-list', JSON.stringify(names));
      }
    });

    this.update();
  }
  async #read(dir) {
    const meta = await dir.getFileHandle('meta.json', {create: true});
    const file = await meta.getFile();
    try {
      return JSON.parse(await file.text() || '{}');
    }
    catch (e) {
      return {};
    }
  }
  async #write(dir, json) {
    const meta = await dir.getFileHandle('meta.json', {create: true});
    const writable = await meta.createWritable();
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(json));
    await writable.write(encodedData);
    await writable.close();
  }
  #active() {
    return this.shadowRoot.querySelector('input[type=radio][name="book"]:checked')?.closest('label');
  }
  #duration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(Error('Cannot decode "' + file.name + '"; File skipped!'));
    });
  }

  async book(name, selected = false) {
    try {
      const root = await navigator.storage.getDirectory();
      try {
        await root.getDirectoryHandle(name);
        alert('Book already exists!');

        return false;
      }
      catch (e) {
        const dir = await root.getDirectoryHandle(name, {
          create: true
        });
        if (selected) {
          this.#change(dir.name);
        }

        await this.update();
      }
    }
    catch (e) {
      console.error(e);
      alert(e.message);
    }
  }
  async files(book, dir, files) {
    const meta = await this.#read(dir);

    // sort new tracks and insert them at the bottom of the list
    files.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    for (const file of files) {
      try {
        const duration = await this.#duration(file);
        meta.tracks = meta.tracks || {};
        meta.tracks[file.name] = {
          duration
        };

        const handle = await dir.getFileHandle(file.name, {create: true});
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        book.file(file.name, duration ?? 0);

        // run "change" event
        this.#name = '';
      }
      catch (e) {
        console.error(e);
        alert('Importing Failed:\n\n' + e.message);
      }
    }
    meta.names = book.names();
    await this.#write(dir, meta);
    this.#change(dir.name);

    return meta;
  }
  async import() {
    const e = this.#active();
    if (!e) {
      // console.info('import is not ready');
      return;
    }
    const root = await navigator.storage.getDirectory();
    const tmp = await root.getDirectoryHandle('tmp', {
      create: true
    });
    // is directory empty
    const keys = await tmp.keys();
    const f = await keys.next();
    if (f.done && f.value === undefined) {
      // console.info('tmp directory is empty');
      return;
    }

    const suggested = e?.id || '';
    const name = prompt('Add this track to:', suggested);
    if (!name) {
      return;
    }
    const d = this.shadowRoot.getElementById(name);
    if (!d) {
      return alert('Cannot find this book!');
    }
    const book = d.querySelector('book-view');

    const dir = await root.getDirectoryHandle(d.id);
    d.click();

    const fs = [];
    for await (const file of tmp.values()) {
      fs.push(await file.getFile());
    }
    // make sure we can read these tracks
    const meta = await this.files(book, dir, fs);
    for (const file of fs) {
      const o = meta.tracks?.[file.name];
      if (o && o.duration) {
        try {
          const handle = await dir.getFileHandle(file.name, {create: true});
          const writable = await handle.createWritable();
          await writable.write(file);
          await writable.close();
        }
        catch (e) {
          console.info('Failed', e);
        }
      }
      // remove the file from tmp directory anyway
      await tmp.removeEntry(file.name);
    }
  }
  async update() {
    try {
      const root = await navigator.storage.getDirectory();
      const t = this.shadowRoot.getElementById('book');

      for await (const [name, dir] of root.entries()) {
        if (name === 'tmp') { // tmp directory used for importing files
          continue;
        }
        if (this.shadowRoot.getElementById(name)) {
          continue;
        }
        if (dir.kind === 'file') {
          continue;
        }

        const clone = document.importNode(t.content, true);
        const book = clone.querySelector('book-view');
        book.name(name);
        // overwrite book's update
        book.onopen = async () => {
          const meta = await this.#read(dir);

          for await (const name of dir.keys()) {
            if (name.endsWith('.json')) {
              continue;
            }
            book.file(name, meta?.tracks?.[name]?.duration ?? 0);
          }
          if (meta.names) {
            book.sort(meta.names);
          }
        };
        book.onsort = async names => {
          const meta = await this.#read(dir);
          meta.names = names;
          await this.#write(dir, meta);
          this.#change(dir.name);
        };
        clone.querySelector('label').id = name;

        this.shadowRoot.getElementById('body').append(clone);
      }
      const names = localStorage.getItem('book-list');
      if (names) {
        this.#sortable.sort(JSON.parse(names));
      }
      // select and open
      const selected = localStorage.getItem('selected-book');
      const e = this.shadowRoot.getElementById(selected);
      if (e) {
        e.click();
        e.querySelector('book-view').open();
      }
      this.shadowRoot.dispatchEvent(new Event('change'));
      // import files
      this.import();
    }
    catch (e) {
      alert(e.message);
      console.error(e);
    }
  }
  /* external use */
  get name() {
    const book = this.#active();
    return book?.id || '';
  }
}
customElements.define('sidebar-view', SidebarView);
