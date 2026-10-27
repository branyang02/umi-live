// Start demonstration clips when visible, and preserve native playback controls.
const videos = [...document.querySelectorAll('main video:not(#teaser)')];
const visible = new Set();
const manuallyPaused = new WeakSet();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function update(video) {
  const shouldPlay = visible.has(video) && !document.hidden && !reducedMotion.matches;
  if (shouldPlay && !video.ended && !manuallyPaused.has(video)) {
    if (video.paused) video.play().catch(() => {});
  } else if (!shouldPlay && !video.paused) {
    video.pause();
  }
}

for (const video of videos) {
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.addEventListener('pause', () => {
    if (visible.has(video) && !document.hidden && !video.ended && !reducedMotion.matches) {
      manuallyPaused.add(video);
    }
  });
  video.addEventListener('play', () => {
    manuallyPaused.delete(video);
    // A pending autoplay request may finish after the visitor scrolls away.
    if ('IntersectionObserver' in window && (!visible.has(video) || document.hidden)) video.pause();
  });
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= .25) visible.add(video);
      else {
        visible.delete(video);
        manuallyPaused.delete(video);
      }
      update(video);
    }
  }, { threshold: [0, .25] });
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => videos.forEach(update));
  reducedMotion.addEventListener('change', () => videos.forEach(update));
}
