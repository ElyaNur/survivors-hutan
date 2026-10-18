// The one mutable view size: landscape 480x270 by default, portrait 270x480 on phones. Read VIEW.w/h/portrait at call time, never copy them.
export const VIEW = { w: 480, h: 270, portrait: false };
export function setPortrait(on) {
  VIEW.portrait = on;
  VIEW.w = on ? 270 : 480; VIEW.h = on ? 480 : 270;
}
