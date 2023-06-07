/* global LaunchParams, launchQueue */

if ('launchQueue' in self && 'files' in LaunchParams.prototype) {
  launchQueue.setConsumer(async launchParams => {
    if (!launchParams.files.length) {
      return;
    }
    document.getElementById('show-sidebar').click();

    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('tmp', {
      create: true
    });
    for (const file of launchParams.files) {
      const handle = await dir.getFileHandle(file.name, {create: true});
      const writable = await handle.createWritable();
      await writable.write(await file.getFile());
      await writable.close();
    }
    document.getElementById('sidebar').import();
  });
}

document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', async e => {
  e.preventDefault();

  const files = e.dataTransfer.files;
  if (files.length === 0) {
    return;
  }

  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle('tmp', {
    create: true
  });

  for (const file of files) {
    const handle = await dir.getFileHandle(file.name, {create: true});
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
  }
  document.getElementById('sidebar').import();
});
