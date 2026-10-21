const container = document.querySelector("#splat-viewer");
const status = document.querySelector("#splat-status");
// 3D Gaussian splat of a UMI-Live unit, reconstructed from handheld video of the device.
// Units: device height = 1, +Y up from the table, origin at the centre of its footprint.
const sceneUrl = "./static/splats/umi-live.ksplat";

if (container && status) {
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
      initialCameraPosition: [-1.59, 1.22, -0.76],
      initialCameraLookAt: [-0.22, 0.48, 0.04],
      useBuiltInControls: true,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
      sphericalHarmonicsDegree: 2,
      sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant
    });

    // The capture never saw the underside, so keep the orbit above the table.
    const controls = viewer.controls;
    if (controls) {
      controls.minPolarAngle = 0.15;
      controls.maxPolarAngle = Math.PI * 0.53;
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
