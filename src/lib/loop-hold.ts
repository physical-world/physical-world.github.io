/** Seconds every looping video holds its last frame before replaying; raise for a longer pause. */
export const LOOP_HOLD_SECONDS = 3;

/** Loops a video with a pause on the last frame. Use instead of the native `loop` attribute. */
export function loopWithHold(
  video: HTMLVideoElement,
  canReplay: () => boolean = () => true,
) {
  video.loop = false;
  let timer: number | undefined;
  video.addEventListener("ended", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Skip if the viewer seeked or replayed during the hold, or the video is hidden.
      if (!video.ended || !canReplay()) return;
      video.currentTime = 0;
      void video.play().catch(() => {});
    }, LOOP_HOLD_SECONDS * 1000);
  });
}
