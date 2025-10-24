# TODO: Improve 3D Viewer Performance and Camera Controls

## Tasks to Complete

1. **Auto-frame model on load using bounding box**
   - Calculate initial camera position based on model's Box3 to fit the view properly

2. **Implement smooth zoom with lerp**
   - Replace GSAP zoom with camera.position.lerp for lightweight smooth zooming
   - Maintain focus on selected object during zoom

3. **Respect OrbitControls rotation limits**
   - Ensure maxPolarAngle = Math.PI / 2 is properly enforced
   - Add minPolarAngle if needed

4. **Re-enable double-click focus**
   - Restore double-click to center camera on clicked object or model center

5. **Add WASD keyboard navigation**
   - Implement WASD keys for free-look navigation with damping
   - Use camera movement along local axes

6. **Performance optimizations**
   - Cap pixel ratio to Math.min(window.devicePixelRatio, 1.5)
   - Keep lightweight animations using lerp
   - Ensure compatibility with .glb and .gltf models

7. **Keep static lighting only**
   - Maintain ambient + directional light, no bloom/shadows

## Progress Tracking
- [x] Task 1: Auto-frame on load
- [x] Task 2: Smooth zoom with lerp
- [x] Task 3: Respect rotation limits
- [x] Task 4: Double-click focus
- [x] Task 5: WASD navigation
- [x] Task 6: Performance optimizations
- [x] Task 7: Static lighting
