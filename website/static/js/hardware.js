// Reveal a document when a section link or a shared URL targets its preview.
function revealHardwarePreview() {
  const preview = document.getElementById(window.location.hash.slice(1));
  if (preview instanceof HTMLDetailsElement) {
    preview.open = true;
  }
}

window.addEventListener('hashchange', revealHardwarePreview);
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const preview = document.getElementById(link.getAttribute('href').slice(1));
  if (preview instanceof HTMLDetailsElement) preview.open = true;
});
revealHardwarePreview();

// Scale each read-only sheet preview without changing the source spreadsheet.
document.querySelectorAll('.document-preview iframe[src^="https://docs.google.com/spreadsheets/"]').forEach((iframe) => {
  const preview = iframe.closest('.document-preview');
  const viewport = document.createElement('div');
  viewport.className = 'sheet-viewport';
  iframe.before(viewport);
  viewport.append(iframe);

  const label = document.createElement('label');
  label.className = 'sheet-zoom';
  label.append('Zoom ');

  const select = document.createElement('select');
  select.setAttribute('aria-label', `${iframe.title} zoom`);
  [50, 75, 100, 125, 150, 200].forEach((percent) => {
    const option = document.createElement('option');
    option.value = String(percent);
    option.textContent = `${percent}%`;
    option.selected = percent === 100;
    select.append(option);
  });
  select.addEventListener('change', () => {
    viewport.style.setProperty('--sheet-zoom', Number(select.value) / 100);
  });
  label.append(select);
  preview.querySelector('.preview-toolbar').append(label);
});
