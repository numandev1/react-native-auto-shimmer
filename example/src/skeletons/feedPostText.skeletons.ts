import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Feed post without image — exact skeleton positions from live capture.
 */
const feedPostTextSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    408: {
      name: 'feedPostText',
      viewportWidth: 408,
      width: 408,
      height: 149,
      skeletons: [
        // Avatar
        { x: 3.922,  y: 16,  w: 9.804,  h: 40, r: '50%' },
        // Name
        { x: 16.176, y: 18,  w: 22.631, h: 18, r: 8 },
        // Handle + time
        { x: 16.176, y: 38,  w: 22.631, h: 16, r: 8 },
        // Post text
        { x: 3.922,  y: 66,  w: 92.157, h: 40, r: 8 },
        // Likes
        { x: 3.922,  y: 116, w: 11.765, h: 17, r: 8 },
        // Comments
        { x: 20.588, y: 116, w: 9.722,  h: 17, r: 8 },
        // Share
        { x: 35.212, y: 116, w: 12.663, h: 17, r: 8 },
      ],
    },
  },
};

export default feedPostTextSkeletons;
