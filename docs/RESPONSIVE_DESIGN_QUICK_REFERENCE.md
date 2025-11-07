# Responsive Design Quick Reference

## Breakpoints Quick Guide

```css
/* Mobile First Approach */
Base styles: 0px - 479px (Extra Small Mobile)

@media (min-width: 480px)  { /* Small Mobile */ }
@media (min-width: 640px)  { /* Medium Mobile / Small Tablet */ }
@media (min-width: 768px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Laptop */ }
@media (min-width: 1280px) { /* Desktop */ }
@media (min-width: 1536px) { /* Large Screen / TV */ }
@media (min-width: 2560px) { /* Ultra-wide */ }
```

## Common Utility Classes

### Display
```html
<!-- Hide on mobile, show on desktop -->
<div class="hide-mobile">Desktop content</div>

<!-- Show only on mobile -->
<div class="show-mobile hide-desktop">Mobile content</div>

<!-- Hide on specific breakpoints -->
<div class="hide-xs show-sm">Hidden on extra small only</div>
```

### Layout
```html
<!-- Responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Items -->
</div>

<!-- Responsive flex -->
<div class="flex flex-col lg:flex-row gap-4 lg:gap-8">
  <!-- Items -->
</div>

<!-- Full width on mobile, auto on desktop -->
<button class="mobile:w-full lg:w-auto">Button</button>
```

### Text
```html
<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-3xl lg:text-4xl 3xl:text-5xl">
  Responsive Heading
</h1>

<!-- Text alignment -->
<p class="mobile:text-center lg:text-left">Responsive text</p>

<!-- Clamp for fluid typography -->
<h2 style="font-size: clamp(1.5rem, 3vw, 3rem);">Fluid Text</h2>
```

### Spacing
```html
<!-- Responsive padding -->
<div class="xs:p-2 sm:p-4 lg:p-6 3xl:p-8">Content</div>

<!-- Responsive gap -->
<div class="flex gap-2 mobile:gap-3 lg:gap-6">Items</div>

<!-- Responsive margin -->
<div class="mobile:my-4 lg:my-8">Spaced content</div>
```

## Component Patterns

### Responsive Container
```jsx
<div className="container-responsive">
  {/* Auto-scales with max-width per breakpoint */}
</div>
```

### Responsive Card
```jsx
<div className="card-responsive">
  {/* Hover effects disabled on touch devices */}
</div>
```

### Touch-Friendly Button
```jsx
<button className="touch-target btn">
  {/* Minimum 44px height on mobile */}
</button>
```

### Responsive Image
```jsx
<img 
  src="/image.jpg" 
  alt="Description"
  className="img-responsive"
  style={{ maxWidth: '100%', height: 'auto' }}
/>

{/* Or for cover behavior */}
<div style={{ width: '100%', height: '300px' }}>
  <img src="/image.jpg" alt="Description" className="img-cover" />
</div>
```

### Responsive Modal
```jsx
<div className="modal-overlay">
  <div className="modal-content" style={{
    width: '95%',
    maxWidth: 'min(90vw, 720px)',
    maxHeight: '90vh',
    padding: 'clamp(1rem, 3vw, 2rem)'
  }}>
    {/* Content */}
  </div>
</div>
```

## Best Practices

### 1. Mobile-First CSS
```css
/* ✅ Good - Mobile first */
.element {
  font-size: 1rem;
}

@media (min-width: 768px) {
  .element {
    font-size: 1.25rem;
  }
}

/* ❌ Bad - Desktop first */
.element {
  font-size: 1.25rem;
}

@media (max-width: 767px) {
  .element {
    font-size: 1rem;
  }
}
```

### 2. Fluid Typography
```css
/* ✅ Good - Scales smoothly */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

/* ❌ Bad - Jumps at breakpoints */
h1 {
  font-size: 1.5rem;
}
@media (min-width: 768px) {
  h1 { font-size: 3rem; }
}
```

### 3. Touch Targets
```css
/* ✅ Good - Touch-friendly */
@media (hover: none) and (pointer: coarse) {
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 20px;
  }
}
```

### 4. Prevent iOS Zoom
```css
/* ✅ Good - Prevents unwanted zoom */
input, select, textarea {
  font-size: 16px; /* iOS won't zoom if >= 16px */
}
```

### 5. Responsive Images
```css
/* ✅ Good - Multiple sizes */
<picture>
  <source media="(min-width: 1024px)" srcset="large.jpg" />
  <source media="(min-width: 640px)" srcset="medium.jpg" />
  <img src="small.jpg" alt="Description" />
</picture>
```

## Testing Checklist

### Mobile (Portrait)
- [ ] iPhone SE (375x667)
- [ ] iPhone 12/13 (390x844)
- [ ] iPhone 12/13 Pro Max (428x926)
- [ ] Samsung Galaxy S21 (360x800)

### Mobile (Landscape)
- [ ] iPhone 12 Landscape (844x390)
- [ ] Samsung Galaxy Landscape (800x360)

### Tablet
- [ ] iPad (768x1024)
- [ ] iPad Pro (1024x1366)

### Desktop
- [ ] Laptop (1280x720)
- [ ] Desktop (1920x1080)
- [ ] Large Screen (2560x1440)

### Interactions
- [ ] Touch scrolling works smoothly
- [ ] Buttons are easily tappable (44px+ target)
- [ ] Forms don't trigger zoom on iOS
- [ ] Modals fit on screen at all sizes
- [ ] Navigation works on mobile (hamburger menu)
- [ ] Images load and scale properly
- [ ] Text is readable at all sizes
- [ ] No horizontal overflow

### Accessibility
- [ ] Can navigate with keyboard
- [ ] Focus indicators visible
- [ ] Screen reader friendly
- [ ] Sufficient color contrast
- [ ] Text can be zoomed to 200%

## Common Issues & Fixes

### Issue: Horizontal Scroll on Mobile
```css
/* Fix: Ensure no fixed widths */
* {
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
  max-width: 100vw;
}

/* Use percentage or vw instead of fixed px */
.element {
  width: 100%;  /* ✅ Good */
  max-width: 100%;  /* ✅ Good */
  /* width: 500px;  ❌ Bad on small screens */
}
```

### Issue: Text Too Small on Mobile
```css
/* Fix: Use clamp or larger base size */
p {
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  line-height: 1.6;
}
```

### Issue: Images Break Layout
```css
/* Fix: Make images responsive */
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### Issue: Buttons Too Small to Tap
```css
/* Fix: Minimum touch target */
button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}
```

### Issue: Modal Too Large on Mobile
```css
/* Fix: Responsive modal */
.modal-content {
  width: 95%;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: clamp(1rem, 3vw, 2rem);
}
```

## Performance Tips

1. **Use CSS Grid/Flexbox** instead of floats
2. **Minimize media queries** by using fluid units (vw, clamp)
3. **Lazy load images** below the fold
4. **Use WebP format** for images with fallbacks
5. **Implement critical CSS** for above-the-fold content
6. **Avoid layout shifts** (set width/height on images)
7. **Use will-change** sparingly for animations
8. **Optimize fonts** (subset, preload, font-display)

## Resources

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [CSS Tricks: Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Tricks: Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Google: Mobile-First Design](https://developers.google.com/web/fundamentals/design-and-ux/responsive)

---

**Last Updated**: November 2025  
**Maintained by**: Development Team
