# 📱 RESPONSIVE DESIGN & PERFORMANCE GUIDE

## Breakpoints Reference

```css
/* Tailwind CSS Breakpoints */
sm  = @media (min-width: 640px)   /* Small phones */
md  = @media (min-width: 768px)   /* Tablets */
lg  = @media (min-width: 1024px)  /* Laptops */
xl  = @media (min-width: 1280px)  /* Desktops */
2xl = @media (min-width: 1536px)  /* Large screens */
```

## Mobile-First Approach

All components should follow mobile-first design:

```jsx
// ✅ GOOD - Mobile first
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

// ❌ BAD - Desktop first
<div className="lg:text-lg md:text-base">
  Not mobile first
</div>
```

## Touch Targets

Minimum touch target size: 44x44px (iOS) or 48x48px (Android)

```jsx
// ✅ GOOD
<button className="px-4 py-2.5 rounded-lg"> {/* ~44px min */}
  Touch button
</button>

// ❌ BAD
<button className="px-1 py-0.5">
  Too small
</button>
```

## Component Responsiveness

### Sidebar
```jsx
// Desktop: Fixed sidebar
// Tablet: Collapsible sidebar
// Mobile: Hamburger menu only

<div className="hidden lg:block w-64">
  {/* Desktop sidebar */}
</div>

<button className="lg:hidden">
  {/* Mobile hamburger */}
</button>
```

### Tables
```jsx
// Desktop: Full virtualized table
// Tablet: Scrollable table
// Mobile: Card layout

<div className="hidden md:block">
  <VirtualizedTable />
</div>

<div className="md:hidden">
  <CardLayout />
</div>
```

### Grids
```jsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3-4 columns

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Modals
```jsx
// Mobile: Full screen with padding
// Desktop: Centered with max-width

<div className="max-w-sm md:max-w-md lg:max-w-lg mx-auto">
  {/* Modal content */}
</div>
```

## Performance Checklist

### Frontend Performance
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting enabled
- [ ] Tree shaking active
- [ ] CSS purging enabled
- [ ] Minification enabled
- [ ] Compression enabled (gzip)
- [ ] Bundle size < 150KB gzipped
- [ ] Time to First Paint < 1s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse score > 90

### Backend Performance
- [ ] Database indexes optimized
- [ ] Query optimization done
- [ ] Connection pooling enabled
- [ ] Response caching where applicable
- [ ] Request rate limiting active
- [ ] Pagination implemented (max 100 items)
- [ ] Response time < 200ms (p95)
- [ ] Memory usage monitored
- [ ] CPU usage monitored

### Network Performance
- [ ] API responses gzipped
- [ ] Cache headers set correctly
- [ ] CDN configured (if applicable)
- [ ] Prefetching enabled
- [ ] DNS pre-resolution enabled
- [ ] Reduced API calls (aggregation)
- [ ] Batch requests where possible

## Accessibility Guidelines

### Keyboard Navigation
```jsx
// Must support:
// - Tab: Next element
// - Shift+Tab: Previous element
// - Enter/Space: Activate
// - Escape: Close modal
// - Arrow keys: Navigate lists

<button className="focus:outline-none focus:ring-2 focus:ring-blue-500">
  Keyboard accessible
</button>
```

### Screen Readers
```jsx
// Must have ARIA labels

<button aria-label="Close dialog">
  <CloseIcon />
</button>

<div role="table" aria-label="User data">
  {/* Table content */}
</div>

<div aria-live="polite">
  {/* Announcement area */}
</div>
```

### Color Contrast
- Minimum ratio: 4.5:1 (normal text)
- Minimum ratio: 3:1 (large text)
- Don't rely on color alone

```css
/* ✅ GOOD contrast */
.text-gray-900 { /* 14:1 */
}

/* ❌ BAD contrast */
.text-gray-400 { /* 2.5:1 */
}
```

### Forms
```jsx
// Associate labels with inputs

<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Provide error messages

<input aria-invalid={hasError} aria-describedby="error" />
<span id="error" role="alert">{errorMessage}</span>
```

## Image Optimization

```jsx
// Lazy loading
<img loading="lazy" src="image.jpg" alt="Description" />

// Responsive images
<img 
  srcSet="image-small.jpg 640w, image-large.jpg 1280w"
  src="image-large.jpg"
  alt="Description"
/>

// Picture element for format selection
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Fallback" />
</picture>
```

## Typography

### Mobile (Base)
```css
h1 { font-size: 24px; line-height: 1.3; }
h2 { font-size: 20px; line-height: 1.3; }
p  { font-size: 16px; line-height: 1.5; }
```

### Desktop (lg:)
```css
h1 { font-size: 32px; }
h2 { font-size: 24px; }
p  { font-size: 18px; }
```

## Common Responsive Patterns

### Hero Section
```jsx
<div className="h-screen flex flex-col items-center justify-center px-4">
  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
    Hero Title
  </h1>
  <p className="text-sm md:text-base lg:text-lg max-w-2xl mb-8">
    Hero subtitle
  </p>
</div>
```

### Feature Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
  {features.map(feature => (
    <FeatureCard key={feature.id} {...feature} />
  ))}
</div>
```

### Sidebar + Content Layout
```jsx
<div className="flex gap-6">
  <aside className="hidden lg:block w-64">
    {/* Sidebar */}
  </aside>
  
  <main className="flex-1 min-w-0">
    {/* Main content */}
  </main>
</div>
```

### Card with Image
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg overflow-hidden">
  <img className="w-full h-48 md:h-full object-cover" src="image.jpg" />
  <div className="p-4 md:p-6">
    {/* Content */}
  </div>
</div>
```

## Testing

### Manual Testing
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPad (768px)
- [ ] Test on MacBook (1440px)
- [ ] Test on 4K display (2560px)
- [ ] Test portrait and landscape orientations
- [ ] Test with slow network (3G)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Test with keyboard only (no mouse)

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari
- [ ] Chrome Mobile

### Tools
```bash
# Performance testing
npm run build && npm run preview

# Bundle analysis
npm install --save-dev webpack-bundle-analyzer

# Lighthouse
npm install -g lighthouse
lighthouse https://your-site.com

# Accessibility testing
npm install --save-dev @axe-core/react
```

## Lighthouse Audit Targets

Target scores for each category:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

## Common Issues & Solutions

### Issue: Text too small on mobile
**Solution**: Use `text-sm md:text-base` or higher

### Issue: Images stretching
**Solution**: Add `object-cover` or `object-contain`

### Issue: Horizontal scroll on mobile
**Solution**: Add `overflow-x-hidden` to body, check max-width

### Issue: Touch targets too small
**Solution**: Ensure buttons are `min-h-12 min-w-12`

### Issue: Modal full screen on mobile
**Solution**: Use `max-w-full mx-4` for mobile, `max-w-md` for desktop

---

## Best Practices Summary

✅ **Mobile First**: Design for small screens first  
✅ **Progressive Enhancement**: Start simple, add features  
✅ **Flexible Layouts**: Use CSS Grid and Flexbox  
✅ **Responsive Images**: Use srcSet and picture elements  
✅ **Optimize Performance**: Measure everything  
✅ **Test Accessibility**: Use screen readers and keyboard  
✅ **Touch Friendly**: 44x44px minimum touch targets  
✅ **Readable Typography**: Appropriate font sizes  
✅ **Color Contrast**: WCAG AA minimum  
✅ **Fast Loading**: Lazy load everything possible  

---

**Last Updated**: May 16, 2026  
**Version**: 2.0
