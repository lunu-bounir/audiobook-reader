document.getElementById('sidebar').addEventListener('close', () => {
  document.body.dataset.sidebar = false;
});
document.getElementById('show-sidebar').onclick = () => {
  document.body.dataset.sidebar = true;
};
document.addEventListener('navigate-forward', () => {
  document.body.dataset.sidebar = true;
});
document.addEventListener('navigate-backward', () => {
  document.body.dataset.sidebar = false;
});
