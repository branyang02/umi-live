const container = document.querySelector("#splat-viewer");
const status = document.querySelector("#splat-status");
const sceneUrl = "https://d28zzqy0iyovbz.cloudfront.net/7605a475/v1/scene.compressed.ply";

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
      initialCameraPosition: [1.1437, 0.3535, 0.5286],
      initialCameraLookAt: [-0.0261, -0.0741, -0.0219],
      useBuiltInControls: true,
      gpuAcceleratedSort: false,
      sharedMemoryForWorkers: false,
      sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant
    });

    const response = await fetch(sceneUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Could not load the example scene (${response.status}).`);
    }

    // Fetch transparently decodes the source's HTTP Content-Encoding: gzip.
    const sceneObjectUrl = URL.createObjectURL(await response.blob());

    try {
      await viewer.addSplatScene(sceneObjectUrl, {
        format: GaussianSplats3D.SceneFormat.Ply,
        showLoadingUI: false
      });
      viewer.start();
      status.remove();
    } finally {
      URL.revokeObjectURL(sceneObjectUrl);
    }
  } catch (error) {
    console.error("3D Gaussian splat preview failed to load:", error);
    const fallback = document.createElement("a");
    fallback.className = "splat-status splat-status--error";
    fallback.href = "https://superspl.at/scene/7605a475";
    fallback.target = "_blank";
    fallback.rel = "noopener";
    fallback.textContent = "3D preview unavailable. Open the example scene.";
    status.replaceWith(fallback);
  }
}
