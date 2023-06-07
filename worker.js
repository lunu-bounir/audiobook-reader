chrome.action.onClicked.addListener(async () => {
  const win = await chrome.windows.getCurrent();

  chrome.storage.local.get({
    width: 500,
    height: 800,
    left: win.left + Math.round((win.width - 500) / 2),
    top: win.top + Math.round((win.height - 800) / 2)
  }, prefs => {
    chrome.windows.create({
      url: '/data/window/index.html',
      width: prefs.width,
      height: prefs.height,
      left: prefs.left,
      top: prefs.top,
      type: 'popup'
    });
  });
});
