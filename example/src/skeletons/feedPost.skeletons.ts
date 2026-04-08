import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Feed post with image — exact skeleton positions from live capture.
 * Two breakpoints captured (379dp and 408dp) for responsive matching.
 */
const feedPostSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    379: {
      name: 'feedPost',
      viewportWidth: 379,
      width: 379,
      height: 387,
      skeletons: [
        // Avatar
        { x: 4.217,  y: 16,  w: 10.542, h: 40,  r: '50%' },
        // Name
        { x: 17.369, y: 16,  w: 25.602, h: 21,  r: 8 },
        // Handle + time
        { x: 17.369, y: 38,  w: 25.602, h: 18,  r: 8 },
        // Post text
        { x: 4.217,  y: 66,  w: 91.566, h: 61,  r: 8 },
        // Post image
        { x: 4.217,  y: 137, w: 91.566, h: 204, r: 12 },
        // Likes
        { x: 4.217,  y: 351, w: 12.651, h: 19,  r: 8 },
        // Comments
        { x: 22.088, y: 351, w: 11.847, h: 19,  r: 8 },
        // Share
        { x: 39.257, y: 351, w: 13.253, h: 19,  r: 8 },
      ],
    },
    408: {
      name: 'feedPost',
      viewportWidth: 408,
      width: 408,
      height: 380,
      skeletons: [
        // Avatar
        { x: 3.922,  y: 16,  w: 9.804,  h: 40,  r: '50%' },
        // Name
        { x: 16.176, y: 18,  w: 24.592, h: 18,  r: 8 },
        // Handle + time
        { x: 16.176, y: 38,  w: 24.592, h: 16,  r: 8 },
        // Post text
        { x: 3.922,  y: 66,  w: 92.157, h: 40,  r: 8 },
        // Post image
        { x: 3.922,  y: 116, w: 92.157, h: 221, r: 12 },
        // Likes
        { x: 3.922,  y: 347, w: 12.745, h: 17,  r: 8 },
        // Comments
        { x: 21.569, y: 347, w: 11.683, h: 17,  r: 8 },
        // Share
        { x: 38.154, y: 347, w: 12.663, h: 17,  r: 8 },
      ],
    },
  },
};

export default feedPostSkeletons;
