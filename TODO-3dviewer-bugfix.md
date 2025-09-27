# TODO: Fix 3D Viewer Bug (Loft and Villa Appearing Combined)

## Overview
Debug and fix runtime rendering issues in EnhancedThreeDModelViewer.js where adjacent model elements (e.g., VillaModel and FamLodge/loft) appear visually combined due to camera offset, lighting, or texture loading. GLTF structure is sound; focus on code tweaks and testing.

## Steps
- [ ] Step 1: Edit components/EnhancedThreeDModelViewer.js
  - Add console logs for object traversal (names, positions, hierarchy).
  - Compute combined bounding boxes for top-level nodes (e.g., all children under VillaModel).
  - Add GLTFLoader error handling and material logging.
  - Adjust lighting (add hemisphere light for better separation).
  - Increase camera offset multipliers (radius * 3 for y, * 4 for z) to isolate views.
  - Optional: Scale scene if needed (gltf.scene.scale.set(1.5, 1.5, 1.5)).

- [ ] Step 2: Start development server
  - Run `npm run dev` to serve the app.

- [ ] Step 3: Test the viewer
  - Navigate to http://localhost:3000/guest/3dview.
  - Select "VillaModel" and "FamLodge" – verify separate focusing, check console for logs/errors.
  - Inspect textures (should show wood/stone details, not flat colors).
  - Take screenshots if issues persist.

- [ ] Step 4: Iterate if needed
  - If still combined: Adjust offsets further or add object-specific lighting.
  - Update this TODO with results.

- [ ] Step 5: Complete
  - Remove debug logs if resolved.
  - Mark as done and close task.
