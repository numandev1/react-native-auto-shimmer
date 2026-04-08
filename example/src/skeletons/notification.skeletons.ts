import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Notification row — exact skeleton positions from live capture.
 */
const notificationSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    408: {
      name: 'notification',
      viewportWidth: 408,
      width: 408,
      height: 72,
      skeletons: [
        // Icon circle (container)
        { x: 3.922,  y: 16, w: 9.804,  h: 40, r: '50%', c: true },
        // Title
        { x: 16.667, y: 19, w: 72.467, h: 17, r: 8 },
        // Body text
        { x: 16.667, y: 38, w: 72.467, h: 16, r: 8 },
        // Timestamp
        { x: 92.075, y: 29, w: 4.003,  h: 14, r: 8 },
      ],
    },
  },
};

export default notificationSkeletons;
