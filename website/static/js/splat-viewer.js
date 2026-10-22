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
      initialCameraPosition: [-1.46, 1.48, -0.68],
      initialCameraLookAt: [-0.22, 0.48, 0.04],
      useBuiltInControls: true,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
      sphericalHarmonicsDegree: 2,
      // The splat was trained with antialiased (mip) rasterization; render it the same way.
      antialiased: true,
      sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant
    });

    // Keep the orbit within the angles the phone video covered well: looking down from at
    // least ~33 degrees above the table, and away from the cable side of the unit
    // (azimuth -70 to 70 degrees about +Y, where the capture is sparse).
    const controls = viewer.controls;
    if (controls) {
      controls.minPolarAngle = 0.15;
      controls.maxPolarAngle = 1.0;
      controls.minAzimuthAngle = 1.22;
      controls.maxAzimuthAngle = -1.22;
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
