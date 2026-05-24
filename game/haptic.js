// game/haptic.js
class HapticFeedback {
    constructor() {
        this.enabled = this.isSupported();
    }

    isSupported() {
        return (
            navigator.vibrate ||
            navigator.webkitVibrate ||
            navigator.mozVibrate ||
            navigator.msVibrate
        );
    }

    vibrate(pattern) {
        if (!this.enabled) return;

        const vibrate =
            navigator.vibrate ||
            navigator.webkitVibrate ||
            navigator.mozVibrate ||
            navigator.msVibrate;

        if (vibrate) {
            vibrate.call(navigator, pattern);
        }
    }

    // Light tap
    tap() {
        this.vibrate(10);
    }

    // Double tap
    doubleTap() {
        this.vibrate([10, 10, 10]);
    }

    // Jump feedback
    jump() {
        this.vibrate([20, 10, 20]);
    }

    // Perfect block feedback
    perfect() {
        this.vibrate([30, 20, 30]);
    }

    // Game over feedback
    gameOver() {
        this.vibrate([100, 50, 100, 50, 100]);
    }

    // Collision feedback
    collision() {
        this.vibrate([5, 5, 5]);
    }
}
