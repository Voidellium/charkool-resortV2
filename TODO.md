# 3D Model Viewer Enhancement Task

## Plan Implementation Steps:

### 1. Create Side Panel Component
- [ ] Create `components/ModelSelectorPanel.js` with smooth animations
- [ ] Add toggle functionality (open/close)
- [ ] Add model selection buttons for all 4 models
- [ ] Style with modern UI design

### 2. Enhance 3D Viewer Component
- [ ] Update `components/ThreeDModelViewer.js` with custom mouse controls
- [ ] Add cursor hide/show functionality on click
- [ ] Implement mouse movement for rotation
- [ ] Add scroll wheel zoom functionality
- [ ] Make layout fixed/fullscreen (no scrolling)

### 3. Update Page Components
- [ ] Update `app/virtual-tour/page.js` to use new components
- [ ] Update `app/guest/3dview/page.js` to use new components
- [ ] Remove select dropdowns from both pages
- [ ] Add "Choose Model" button and panel integration

### 4. Testing & Verification
- [ ] Test panel animations on both pages
- [ ] Verify model switching works correctly
- [ ] Test mouse controls (cursor, rotation, zoom)
- [ ] Check responsive behavior

## Models Available:
- Teepee Model (`/models/Teepee.obj`)
- Bilyaran Store Model (`/models/BilyaranStore.obj`)
- Poolside Kubo Model (`/models/PoolsideKubo.obj`)
- Stage Model (`/models/Stage.obj`)
