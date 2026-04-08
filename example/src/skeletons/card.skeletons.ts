import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Content card — exact skeleton positions from live capture.
 * x/w are percentages (scale with container width on any device).
 * y/h are absolute dp (match the capture device layout).
 */
const cardSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    408: {
      name: 'card',
      viewportWidth: 408,
      width: 408,
      height: 375,
      skeletons: [
        // Hero image
        { x: 0,      y: 0,   w: 100,    h: 230, r: 8 },
        // Title
        { x: 3.922,  y: 246, w: 92.157, h: 22,  r: 8 },
        // Body text
        { x: 3.922,  y: 275, w: 92.157, h: 40,  r: 8 },
        // Avatar
        { x: 3.922,  y: 327, w: 7.843,  h: 32,  r: '50%' },
        // Author name
        { x: 14.216, y: 335, w: 18.464, h: 17,  r: 8 },
      ],
    },
  },
};

export default cardSkeletons;
