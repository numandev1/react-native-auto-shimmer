import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Product grid item — exact skeleton positions from live capture.
 * Two breakpoints captured (184dp and 198dp grid cell widths).
 */
const productItemSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    184: {
      name: 'productItem',
      viewportWidth: 184,
      width: 184,
      height: 237,
      skeletons: [
        // Product image
        { x: 5.394, y: 10,  w: 89.212, h: 163, r: 8 },
        // Title
        { x: 5.394, y: 179, w: 89.212, h: 19,  r: 8 },
        // Price
        { x: 5.394, y: 205, w: 89.212, h: 22,  r: 8 },
      ],
    },
    198: {
      name: 'productItem',
      viewportWidth: 198,
      width: 198,
      height: 246,
      skeletons: [
        // Product image
        { x: 5.051, y: 10,  w: 89.899, h: 178, r: 8 },
        // Title
        { x: 5.051, y: 194, w: 89.899, h: 17,  r: 8 },
        // Price
        { x: 5.051, y: 217, w: 89.899, h: 19,  r: 8 },
      ],
    },
  },
};

export default productItemSkeletons;
