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
