window.addEventListener('load', () => {
  history.pushState(-1, null);
  history.pushState(0, null);
  history.pushState(1, null);
  history.go(-1); // start in main state
});

window.addEventListener('popstate', e => {
  const state = e.state;

  if (state === 1) {
    history.back();
    document.dispatchEvent(new Event('navigate-forward'));
  }
  else if (state === -1) {
    history.forward();
    document.dispatchEvent(new Event('navigate-backward'));
  }
}, false);

{
  const swipeThreshold = 50; // Minimum swipe distance threshold
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, false);
  window.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    // Function to handle swipe direction

    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = touchEndY - touchStartY;
    if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
      if (swipeDistanceX > swipeThreshold) {
        document.dispatchEvent(new Event('navigate-forward'));
      }
      else if (swipeDistanceX < -swipeThreshold) {
        document.dispatchEvent(new Event('navigate-backward'));
      }
    }
  }, false);
}
