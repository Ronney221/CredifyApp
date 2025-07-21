# Image & Asset Optimization Plan

## 📊 Current Asset Analysis

### **Total Size**: 2.1MB in assets/images/

### **Largest Files Identified:**
- `icon.png` - 647KB (app icon - very large)
- `chase_sapphire_preferred.png` - 380KB (card image)
- `citi_prestige.jpeg` - 254KB (card image)
- `logo_text.png` - 205KB (logo)
- `chase_sapphire_reserve.png` - 46KB
- `boa_premium_rewards_elite.png` - 53KB

### **File Format Distribution:**
- **PNG files**: 10 files (largest performance impact)
- **AVIF files**: 7 files (already optimized)
- **JPEG files**: 1 file
- **SVG files**: 23 partner logos (good choice)

## 🎯 Optimization Opportunities

### **Step 4A: Image Compression** 
**Target**: Reduce bundle size by 40-60%

1. **App Icon Optimization**
   - `icon.png` (647KB) → Target: <100KB
   - Method: PNG optimization + resize if oversized

2. **Card Image Optimization**
   - `chase_sapphire_preferred.png` (380KB) → Target: <80KB
   - `citi_prestige.jpeg` (254KB) → Target: <60KB
   - `logo_text.png` (205KB) → Target: <50KB
   - Method: PNG optimization, potential WebP conversion

3. **Batch Optimization**
   - Optimize all PNG files >20KB
   - Maintain visual quality while reducing file size

### **Step 4B: Lazy Loading Implementation**
**Target**: Faster initial app load

1. **expo-image Integration**
   ```typescript
   import { Image } from 'expo-image';
   
   // Replace React Native Image with expo-image
   <Image
     source={{ uri: cardImageUrl }}
     style={styles.cardImage}
     contentFit="contain"
     transition={200}
     cachePolicy="memory-disk"
   />
   ```

2. **Card Component Updates**
   - Update `UserCardItem` component
   - Update `ExpandableCard` component
   - Add loading placeholders

3. **Caching Configuration**
   ```typescript
   const imageProps = {
     cachePolicy: 'memory-disk' as const,
     priority: 'normal' as const,
     recyclingKey: cardId,
   };
   ```

### **Step 4C: Bundle Optimization**
**Target**: Reduce overall bundle size

1. **Asset Bundle Review**
   - Check `app.json` assetBundlePatterns
   - Current: `["**/*"]` (includes everything)
   - Proposed: Selective patterns

2. **Unused Asset Removal**
   - `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png` (likely unused)
   - `partial-react-logo.png` (likely unused)
   - Verify usage before removal

3. **Format Optimization**
   - Keep AVIF files (already optimized)
   - Consider WebP for remaining PNGs
   - SVG partner logos are already optimal

## 🛠 Implementation Steps

### **Phase 1: Quick Wins** (30 minutes)
1. **Optimize largest files**:
   ```bash
   # Use image optimization tools
   npx imagemin icon.png --out-dir=optimized/
   npx imagemin chase_sapphire_preferred.png --out-dir=optimized/
   npx imagemin citi_prestige.jpeg --out-dir=optimized/
   ```

2. **Replace optimized files**
3. **Test app functionality**

### **Phase 2: Lazy Loading** (1 hour)
1. **Install expo-image** (if not already installed)
2. **Update card components**:
   - `components/home/UserCardItem.tsx`
   - `components/home/ExpandableCard.tsx`
3. **Add loading states**
4. **Test image loading performance**

### **Phase 3: Bundle Optimization** (30 minutes)
1. **Review asset usage**:
   ```bash
   # Search for image references
   grep -r "react-logo" . --exclude-dir=node_modules
   grep -r "partial-react-logo" . --exclude-dir=node_modules
   ```

2. **Update assetBundlePatterns** in app.json:
   ```json
   {
     "assetBundlePatterns": [
       "assets/images/*.png",
       "assets/images/*.avif", 
       "assets/images/*.jpeg",
       "assets/animations/*.json",
       "assets/partner_svg/*.svg",
       "assets/fonts/*.ttf"
     ]
   }
   ```

3. **Remove unused assets**
4. **Test build size**

## 📏 Expected Results

### **File Size Reductions**:
- **icon.png**: 647KB → ~90KB (86% reduction)
- **chase_sapphire_preferred.png**: 380KB → ~75KB (80% reduction)
- **citi_prestige.jpeg**: 254KB → ~50KB (80% reduction)
- **logo_text.png**: 205KB → ~40KB (80% reduction)

### **Total Bundle Impact**:
- **Before**: ~2.1MB assets
- **After**: ~1.0MB assets (52% reduction)
- **App bundle reduction**: ~1MB smaller

### **Performance Gains**:
- **Initial load**: 15-25% faster
- **Memory usage**: 20-30% less image memory
- **Network**: Faster downloads on slower connections

## 🔧 Tools & Commands

### **Image Optimization Tools**:
```bash
# Install optimization tools
npm install -g imagemin-cli imagemin-pngquant imagemin-mozjpeg

# Optimize PNG files
imagemin assets/images/*.png --plugin=pngquant --out-dir=assets/images/optimized/

# Optimize JPEG files  
imagemin assets/images/*.jpeg --plugin=mozjpeg --out-dir=assets/images/optimized/

# Check file sizes
du -h assets/images/*.{png,jpeg,avif}
```

### **Bundle Analysis**:
```bash
# Analyze bundle size (after build)
npx expo export --platform=web
du -h dist/
```

## ⚠️ Considerations

### **Quality vs Size**:
- Maintain visual quality for card images (user recognition)
- App icon must remain crisp at all sizes
- Test on multiple devices and screen densities

### **Format Support**:
- WebP: Excellent compression, good React Native support
- AVIF: Best compression, keep existing AVIF files
- PNG: Keep for transparency requirements

### **Caching Strategy**:
- expo-image handles automatic caching
- Consider cache invalidation for updated card images
- Memory vs disk cache trade-offs

## 📅 Future Enhancements

1. **Dynamic Image Loading**:
   - Load card images only when needed
   - Progressive loading for large screens

2. **Responsive Images**:
   - Multiple resolutions for different screen densities
   - Automatic format selection based on device support

3. **Advanced Caching**:
   - Background image prefetching
   - Smart cache invalidation

---

**Status**: Ready for Implementation
**Estimated Time**: 2 hours total
**Priority**: Medium (performance improvement)
**Dependencies**: None