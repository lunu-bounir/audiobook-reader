class PlayerView extends HTMLElement {
  static version = '0.1.0';

  #book;
  #delay = false;
  #config = {
    delays: {
      tick: 300, // ms
      start: 10, // seconds
      short: 10, // seconds
      long: 30 // seconds
    }
  };

  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: 'open'
    });
    shadow.innerHTML = `
      <style>
        :host {
          font-size: inherit;
          overflow: hidden;
          container: body / inline-size;
        }
        @container body (max-width: 10ch) {
          #content {
            display: none;
          }
        }
        section {
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: var(--gap, 5px);
        }
        select {
          border: none;
          outline: none;
          background-color: transparent;
        }
        h1 {
          margin: 0;
        }
        #content {
          height: 100%;
          display: grid;
          grid-template-rows: min-content min-content 1fr min-content  min-content min-content;
          grid-gap: calc(var(--gap) * 2);
          accent-color: var(--fg, #202124);
        }
        input[type=button] {
          width: var(--button, 48px);
          aspect-ratio: 1/1;
          border: none;
          background-size: 100%;
          background-repeat: no-repeat;
          background-position: center center;
          background-color: transparent;
          cursor: pointer;
        }
        input[type=range] {
          cursor: pointer;
        }
        #content:has(audio:not([src])) :is(#backward-1m, #backward-10s, #forward-1m, #forward-10s),
        #content:has(audio:not([src])) :is(#progress, #player, #current, #duration),
        input:disabled,
        #content.disabled select,
        #content.disabled input {
          opacity: 0.2;
          pointer-events: none;
        }
        #player {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        #play {
          width: calc(var(--button) * 3);
          background-image: url(images/play.svg);
        }
        #play.paused {
          background-image: url(images/pause.svg);
        }
        #boost {
          width: calc(var(--button) * 0.5);
          background-image: url(images/boost.svg);
          opacity: 0.4;
        }
        #boost.active {
          opacity: 1;
        }
        #previous-track {
          background-image: url(images/previous.svg);
        }
        #next-track {
          background-image: url(images/next.svg);
        }
        #backward-1m input,
        #backward-10s input {
          background-image: url(images/backward.svg);
        }
        #forward-1m input,
        #forward-10s input {
          background-image: url(images/forward.svg);
        }
        #tracks {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1
        }
        #summary {
          display: flex;
          flex-direction: column;
        }
        #summary progress {
          width: 100%;
        }
        #tools {
          padding: var(--gap) 0;
          justify-content: end;
        }
        .v {
          display: inline-grid;
          justify-content: center;
          cursor: pointer;
        }
        .v * {
          pointer-events: none;
        }
        .v span {
          text-align: center;
        }
        #tracks select:empty {
          display: none;
        }
        #progress {
          flex: 1;
        }

        @media (prefers-color-scheme: dark) {
          input[type=button] {
            filter: invert(1);
          }
        }
      </style>
      <div id="content">
        <audio id="audio"></audio>
        <section id="tools">
          <input type="range" id="volume" min="10" max="100" step="5" value="80"/>
          <input type="button" id="boost">
          <select id="speed">
            <option value="5">0.5x</option>
            <option value="10" selected>1.0x</option>
            <option value="15">1.5x</option>
            <option value="20">2.0x</option>
            <option value="30">3.0x</option>
          </select>
          <slot></slot>
        </section>
        <section id="summary">
          <h1 id="name">Book Name</h1>
          <progress id="tracks-progress" value="0" max="100"></progress>
          <label>Reading <span id="current-track">0</span> of <span id="total-tracks">0</span> files</label>
        </section>
        <section>
          <label id="player">
            <input type="button" id="play">
          </label>
        </section>
        <section>
          <input type="button" id="previous-track" disabled>
          <div class="wide" id="tracks">
            <select></select>
          </div>
          <input type="button" id="next-track" disabled>
        </section>
        <section>
          <span id="current">00:00:00</span>
          <input type="range" id="progress" min="0" max="100" value="0" step="0.01"/>
          <span id="duration">00:00:00</span>
        </section>
        <section>
          <label class="v" id="backward-1m">
            <input type="button">
            <span>1m</span>
          </label>
          <label class="v" id="backward-10s">
            <input type="button">
            <span>10s</span>
          </label>
          <label class="v" id="forward-10s">
            <input type="button">
            <span>10s</span>
          </label>
          <label class="v" id="forward-1m">
            <input type="button">
            <span>1m</span>
          </label>
        </section>
      </div>
    `;
  }
  connectedCallback() {
    const audio = this.shadowRoot.getElementById('audio');
    const select = this.shadowRoot.querySelector('#tracks select');

    this.shadowRoot.onclick = () => {
      this.dispatchEvent(new Event('close'));
    };
    select.onchange = async e => {
      const select = e.target;

      const meta = await this.#meta();
      const reading = await this.#reading();

      this.#progress(reading, meta, select, true, true);
      this.start(true);
    };
    this.shadowRoot.getElementById('previous-track').onclick = () => {
      select.selectedIndex -= 1;
      select.dispatchEvent(new Event('change'));
    };
    this.shadowRoot.getElementById('next-track').onclick = () => {
      select.selectedIndex += 1;
      select.dispatchEvent(new Event('change'));
    };
    this.shadowRoot.getElementById('backward-1m').onclick = () => {
      const skipTime = this.#config.delays.long;
      audio.pause();
      audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
      setTimeout(() => audio.play(), this.#config.delays.tick);
    };
    this.shadowRoot.getElementById('backward-10s').onclick = () => {
      const skipTime = this.#config.delays.short;
      audio.pause();
      audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
      setTimeout(() => audio.play(), this.#config.delays.tick);
    };
    this.shadowRoot.getElementById('forward-1m').onclick = () => {
      const skipTime = this.#config.delays.long;
      audio.pause();
      audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
      setTimeout(() => audio.play(), this.#config.delays.tick);
    };
    this.shadowRoot.getElementById('forward-10s').onclick = () => {
      const skipTime = this.#config.delays.short;
      audio.pause();
      audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
      setTimeout(() => audio.play(), this.#config.delays.tick);
    };
    this.shadowRoot.getElementById('speed').onchange = async e => {
      const speed = Number(e.target.value);

      audio.playbackRate = speed / 10;

      const reading = await this.#reading();
      reading.speed = speed;
      await this.#write(reading);
    };
    // prevent page sweep
    this.shadowRoot.getElementById('volume').ontouchend = e => {
      e.stopPropagation();
    };
    this.shadowRoot.getElementById('volume').oninput = async e => {
      const volume = e.target.valueAsNumber;

      audio.volume = volume / 100;

      const reading = await this.#reading();
      reading.volume = volume;
      await this.#write(reading);
    };
    this.shadowRoot.getElementById('boost').onclick = async e => {
      e.target.classList.toggle('active');

      const boost = e.target.classList.contains('active');
      const reading = await this.#reading();
      reading.boost = boost;
      await this.#write(reading);
    };

    audio.addEventListener('pause', () => {
      this.shadowRoot.getElementById('play').classList.remove('paused');
    });
    audio.addEventListener('play', () => {
      // run with delay
      if (this.#delay) {
        const skipTime = this.#config.delays.start;
        audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
      }
      this.#delay = false;

      this.shadowRoot.getElementById('play').classList.add('paused');
    });
    audio.addEventListener('ended', async () => {
      const selectedIndex = select.selectedIndex;
      if (selectedIndex !== select.length - 1) {
        select.selectedIndex = selectedIndex + 1;
        const reading = await this.#reading();
        const meta = await this.#meta();
        this.#progress(reading, meta, select, true, true);
        this.start(true);
      }
      else {
        this.dispatchEvent(new Event('done'));
      }
    });
    {
      let currentTime = 0;

      const write = async () => {
        const track = select.value;
        const reading = await this.#reading();
        reading.position = reading.position || {};
        if (reading.position[track] !== currentTime) {
          reading.position[track] = currentTime;
          await this.#write(reading);
        }
      };
      write.cache = {};

      audio.addEventListener('timeupdate', e => {
        currentTime = e.target.currentTime;
        const progress = this.shadowRoot.getElementById('progress');
        progress.value = currentTime;
        this.shadowRoot.getElementById('current').textContent = this.#convert(currentTime);
        this.shadowRoot.getElementById('tracks-progress').value = select.selectedIndex + (currentTime / progress.max);

        write();
      });
    }

    // prevent page sweep
    this.shadowRoot.getElementById('progress').ontouchend = e => {
      e.stopPropagation();
    };
    this.shadowRoot.getElementById('progress').oninput = e => {
      audio.currentTime = e.target.valueAsNumber;
    };

    this.shadowRoot.getElementById('play').onclick = e => {
      const paused = e.target.classList.contains('paused');

      if (paused === false) {
        if (audio.src) {
          audio.play();
        }
        else {
          this.start();
        }
      }
      else {
        audio.pause();
      }
    };
  }
  async #meta() {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(this.#book);
    const meta = await directory.getFileHandle('meta.json', {create: true});
    const file = await meta.getFile();
    try {
      return JSON.parse(await file.text() || '{}');
    }
    catch (e) {
      return {};
    }
  }
  async #reading() {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(this.#book);
    const meta = await directory.getFileHandle('reading.json', {create: true});
    const file = await meta.getFile();
    try {
      return JSON.parse(await file.text() || '{}');
    }
    catch (e) {
      return {};
    }
  }
  async #write(json) {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(this.#book);
    const file = await directory.getFileHandle('reading.json', {create: true});
    const writable = await file.createWritable();
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(json));
    await writable.write(encodedData);
    await writable.close();
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
  name(name) {
    this.#book = name;
    this.shadowRoot.getElementById('name').textContent = name;
  }
  #progress(reading, meta, select, reset = false, write = true) {
    const selected = select.value;

    const current = reset ? 0 : reading?.position?.[selected] ?? 0;
    this.shadowRoot.getElementById('current').textContent = this.#convert(current);
    const total = meta?.tracks?.[selected]?.duration ?? 0;
    this.shadowRoot.getElementById('duration').textContent = this.#convert(total);
    this.shadowRoot.getElementById('progress').max = total;
    this.shadowRoot.getElementById('progress').value = current;

    this.shadowRoot.getElementById('current-track').textContent = select.selectedIndex + 1;
    this.shadowRoot.getElementById('total-tracks').textContent = select.length;
    this.shadowRoot.getElementById('tracks-progress').value = select.selectedIndex;
    this.shadowRoot.getElementById('tracks-progress').max = select.length;

    this.shadowRoot.getElementById('previous-track').disabled = select.selectedIndex === 0;
    this.shadowRoot.getElementById('next-track').disabled = select.selectedIndex === select.length - 1;

    if (write) {
      reading.selected = selected;
      this.#write(reading);
    }
  }
  async update() {
    if (!this.#book) {
      return;
    }

    const meta = await this.#meta();

    // tracks
    const select = this.shadowRoot.querySelector('#tracks select');
    select.textContent = '';
    const names = Object.keys(meta.tracks || {});
    if (meta.names) {
      names.sort((a, b) => {
        return meta.names.indexOf(a) - meta.names.indexOf(b);
      });
    }
    const reading = await this.#reading();

    const selected = reading?.selected ?? names[0];

    for (const name of names) {
      const option = document.createElement('option');
      option.textContent = option.value = name;
      option.selected = name === selected;
      select.append(option);
    }

    //
    this.shadowRoot.getElementById('content').classList[names.length === 0 ? 'add' : 'remove']('disabled');

    // current
    this.#progress(reading, meta, select, false, false);

    // speed
    const speed = reading?.speed ?? 10;
    this.shadowRoot.getElementById('speed').value = speed;

    // volume
    const volume = reading?.volume ?? 80;
    this.shadowRoot.getElementById('volume').value = volume;

    // boost
    const boost = reading?.boost ?? false;
    this.shadowRoot.getElementById('boost').classList[boost ? 'add' : 'remove']('active');

    //
    this.start(false, false);
  }
  pause() {
    this.shadowRoot.getElementById('audio').pause();
  }
  async start(reset = false, play = true) {
    const audio = this.shadowRoot.getElementById('audio');
    const select = this.shadowRoot.querySelector('#tracks select');

    if (select.value) {
      audio.playbackRate = Number(this.shadowRoot.getElementById('speed').value) / 10;
      audio.volume = this.shadowRoot.getElementById('volume').valueAsNumber / 100;

      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(this.#book);
      const fileHandle = await directory.getFileHandle(select.value);
      const file = await fileHandle.getFile();
      audio.src = URL.createObjectURL(file);
      if (reset) {
        audio.currentTime = 0;
      }
      else {
        const n = this.shadowRoot.getElementById('progress').valueAsNumber;
        audio.currentTime = n;
        this.#delay = true;
      }
      if (play) {
        await audio.play();
      }
      if ('mediaSession' in navigator) {
        const o = {
          title: this.#book
        };
        if (location.href.startsWith('http')) {
          o.artwork = [
            {src: 'icons/16.png', sizes: '16x16', type: 'image/png'},
            {src: 'icons/24.png', sizes: '24x24', type: 'image/png'},
            {src: 'icons/32.png', sizes: '32x32', type: 'image/png'},
            {src: 'icons/48.png', sizes: '48x48', type: 'image/png'},
            {src: 'icons/128.png', sizes: '128x128', type: 'image/png'},
            {src: 'icons/256.png', sizes: '256x256', type: 'image/png'},
            {src: 'icons/512.png', sizes: '512x512', type: 'image/png'},
            {src: 'icons/icon.svg', type: 'image/svg'}
          ];
        }

        navigator.mediaSession.metadata = new MediaMetadata(o);
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('stop', () => audio.pause());
        navigator.mediaSession.setActionHandler('previoustrack', select.selectedIndex === 0 ? undefined : () => {
          this.shadowRoot.getElementById('previous-track').click();
        });
        navigator.mediaSession.setActionHandler('nexttrack', select.selectedIndex === select.length - 1 ? undefined : () => {
          this.shadowRoot.getElementById('next-track').click();
        });
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          this.shadowRoot.getElementById('backward-1m').click();
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          this.shadowRoot.getElementById('forward-1m').click();
        });
        navigator.mediaSession.setActionHandler('seekto', d => {
          if (d.fastSeek && 'fastSeek' in audio) {
            audio.fastSeek(d.seekTime);
          }
          else {
            audio.currentTime = d.seekTime;
          }
        });
      }
    }
  }
}
customElements.define('player-view', PlayerView);
