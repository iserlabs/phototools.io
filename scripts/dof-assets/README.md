# Asset Processing Scripts for DOF Simulator

Two ESM scripts for preprocessing subject and background images for the DOF Simulator renderer.

## `cutout.mjs`

Removes chroma-key green background from a PNG image and produces a transparent WebP with despill and feathered edge.

```bash
node scripts/dof-assets/cutout.mjs <in.png> <out.webp>
```

### Behavior

- **Green channel detection**: Pixels where `G > 150` AND `G > R × 1.5` AND `G > B × 1.5` are keyed to full transparency.
- **Despill**: On pixels that are kept, if green is the dominant channel, it is reduced to the max of red and blue to remove green fringe.
- **Alpha feather**: The alpha channel is blurred by 1 pixel (box blur) and composited back, creating a soft edge.
- **Output**: WebP with `quality: 90, alphaQuality: 90`.

### Convention

All subject images must use **`#00FF00`** (pure green, RGB 0, 255, 0) as the background color to be keyed out. Pure green is unambiguous in RGBA processing and avoids artifacts on skin tones or clothing.

## `slice.mjs`

Applies an SVG alpha mask to a cutout image, producing a depth-slice layer.

```bash
node scripts/dof-assets/slice.mjs <in.webp> <mask.svg> <out.webp>
```

### Behavior

- **Mask resize**: The SVG is rasterized and resized to match the input dimensions.
- **Blend mode**: Uses `dest-in` composite to apply the mask as an alpha channel.
- **Output**: WebP with `quality: 90, alphaQuality: 90`.

## SVG Mask Authoring

Masks are SVG files with a grayscale appearance (white = opaque, black = transparent). Use the following patterns:

### Simple Mask (No Feathering)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="black"/>
  <!-- White areas are kept, black areas are transparent -->
  <circle cx="500" cy="500" r="400" fill="white"/>
</svg>
```

### Feathered Mask (Soft Edge)

For smooth, natural-looking depth transitions, apply a Gaussian blur to the mask edge:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <defs>
    <filter id="blur">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  <rect width="1000" height="1000" fill="black"/>
  <circle cx="500" cy="500" r="400" fill="white" filter="url(#blur)"/>
</svg>
```

### Guidelines

- **Viewbox size**: Use 1000×1000 to avoid rasterization artifacts; `slice.mjs` will resize to the input image dimensions.
- **Black background**: Start with a black rectangle to define the outer transparent region.
- **White shapes**: Use white paths, circles, polygons, etc. to define opaque regions.
- **Feathering strength**: `stdDeviation="6"` (6 pixels) gives a natural soft focus transition. Adjust 3–12 depending on desired blur amount.
- **Gradient masks**: For complex depth distributions, use `<linearGradient>` or `<radialGradient>` instead of solid fills (white = 1.0 opacity, black = 0.0 opacity).

## Usage in Tasks 10–11

Tasks 10 and 11 generate AI-produced images and use these scripts to process them:

1. **Task 10 (subjects)**: Generate 8 subject images with green backgrounds → run `cutout.mjs` → create 3 depth masks per subject → run `slice.mjs` 3× per subject → produce 24 depth-slice WebPs
2. **Task 11 (backgrounds)**: Generate 8 background images (may need keying or masking) → process with these scripts → produce depth-slice variants

See `src/lib/data/dof/models.ts` and `backgrounds.ts` for expected file naming and registration.
