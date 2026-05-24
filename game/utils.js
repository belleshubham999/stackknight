// game/utils.js
const Utils = {
    // Check AABB collision between two rectangles
    rectIntersect: (r1, r2) => {
        return !(
            r2.x >= r1.x + r1.width ||
            r2.x + r2.width <= r1.x ||
            r2.y >= r1.y + r1.height ||
            r2.y + r2.height <= r1.y
        );
    },

    // Random integer between min and max (inclusive)
    randomRange: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Clamp value between min and max
    clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    }
};