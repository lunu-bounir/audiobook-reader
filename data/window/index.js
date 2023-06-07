const sidebar = document.getElementById('sidebar');
const player = document.getElementById('player');

sidebar.addEventListener('change', e => {
  document.title = e.target.name || 'Add a new Book!';
  player.name(e.target.name);
  player.update();
});
player.addEventListener('done', () => {
  document.getElementById('show-sidebar').click();
});

window.onload = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
};
