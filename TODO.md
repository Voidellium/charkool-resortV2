# 3D Viewer Bug Fix Progress

## Overview
Fixing issues in guest virtual tour and 3D view pages: no zoom on model clicks, models turning blank on selection, and free view not displaying models properly.

## Steps
- [ ] Step 1: Update components/EnhancedThreeDModelViewer.js
  - Add onSelectObject prop and use it in onObjectClick to enable direct model selection/zoom.
  - Change emissive highlight to brighter color (e.g., 0x00ff88) to prevent blanking; add fallback for materials without emissive support.
  - Compute overall scene bounding box in Model component; use it for default free view position when selectedObject is null.
  - Increase hemisphereLight intensity to 0.8; ensure directional lights are positioned to illuminate all models.
  - Set OrbitControls enableZoom and enableRotate to true after animation completes.

- [ ] Step 2: Update app/guest/3dview/page.js
  - Add onSelectObject prop to EnhancedThreeDModelViewer, handling it to update selectedObject state.
  - Update instructions overlay: Clarify controls, remove misleading "Click the model to start interaction" since clicks now select.

- [ ] Step 3: Update app/virtual-tour/page.js
  - Add onSelectObject prop to EnhancedThreeDModelViewer, handling it to update selectedObject state.
  - Update instructions overlay: Clarify controls, remove misleading "Click the model to start interaction" since clicks now select.

- [ ] Step 4: Test the fixes
  - Run `npm run dev`.
  - Navigate to /guest/3dview and /virtual-tour.
  - Test button selections, direct model clicks, free view, zoom/rotate.
  - Check console for errors; verify no blanking.

- [ ] Step 5: Cleanup and complete
  - Conditionalize or remove debug console logs in EnhancedThreeDModelViewer.js.
  - Mark this TODO as done and update TODO-3dviewer-bugfix.md if related issues resolved.
