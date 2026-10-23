const datasetViewer = document.getElementById('dataset-viewer');
const datasetToggle = document.getElementById('dataset-viewer-toggle');
const datasetHelp = document.getElementById('dataset-viewer-help');

if (datasetViewer && datasetToggle && datasetHelp) {
  const embed = datasetViewer.closest('.dataset-embed');

  function setInteraction(enabled) {
    // Cross-origin viewers consume wheel/touch events, so interaction is opt-in.
    embed.classList.toggle('dataset-embed--locked', !enabled);
    datasetViewer.inert = !enabled;
    datasetViewer.tabIndex = enabled ? 0 : -1;
    datasetToggle.setAttribute('aria-pressed', String(enabled));
    datasetToggle.textContent = enabled ? 'Resume page scrolling' : 'Interact with viewer';
    datasetHelp.textContent = enabled
      ? 'Viewer interaction is on. Resume page scrolling when you are done.'
      : 'Page scrolling is on. Enable interaction to explore the episode here.';
  }

  setInteraction(false);
  datasetToggle.hidden = false;
  datasetHelp.hidden = false;
  datasetToggle.addEventListener('click', () => {
    setInteraction(datasetToggle.getAttribute('aria-pressed') !== 'true');
  });

  document.addEventListener('pointerdown', (event) => {
    if (!embed.contains(event.target) && !datasetToggle.contains(event.target)) {
      setInteraction(false);
    }
  });
}
