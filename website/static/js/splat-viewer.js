const container = document.querySelector("#splat-viewer");
const status = document.querySelector("#splat-status");
// 3D Gaussian splat of a UMI-Live unit, reconstructed from handheld video of the device.
// Units: device height = 1, +Y up from the table, origin at the centre of its footprint.
const sceneUrl = "./static/splats/umi-live.ksplat";

async function start() {
  try {
    const [THREE, GaussianSplats3D] = await Promise.all([
      import("three"),
      import("https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.7/build/gaussian-splats-3d.module.js")
    ]);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const viewer = new GaussianSplats3D.Viewer({
      rootElement: container,
      threeScene: scene,
      cameraUp: [0, 1, 0],
      initialCameraPosition: [-1.48, 1.35, 0.79],
      initialCameraLookAt: [-0.15, 0.5, 0.04],
      useBuiltInControls: true,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
      sphericalHarmonicsDegree: 2,
      // The splat was trained with antialiased (mip) rasterization; render it the same way.
      antialiased: true,
      sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant
    });

    // The walk-around video covers every side, so the orbit goes all the way round; it stops
    // about 5 degrees above the table, below which the camera never went.
    const controls = viewer.controls;
    if (controls) {
      controls.minPolarAngle = 0.15;
      controls.maxPolarAngle = 1.48;
      controls.minDistance = 1.2;
      controls.maxDistance = 5.0;
    }

    await viewer.addSplatScene(sceneUrl, {
      format: GaussianSplats3D.SceneFormat.KSplat,
      showLoadingUI: false
    });
    viewer.start();
    status.remove();
  } catch (error) {
    console.error("3D Gaussian splat preview failed to load:", error);
    status.classList.add("splat-status--error");
    status.textContent = "3D preview unavailable in this browser.";
  }
}

// Fetch the 6 MB splat only once the reader gets near the section.
if (container && status) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { rootMargin: "100% 0px" });
  observer.observe(container);
}
