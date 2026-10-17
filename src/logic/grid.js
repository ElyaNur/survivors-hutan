// Uniform spatial hash. query() returns candidates from overlapping cells; caller checks exact distance.
export class SpatialGrid {
  constructor(cell = 32) { this.cell = cell; this.cells = new Map(); }
  clear() { this.cells.clear(); }
  insert(e) {
    const k = this.#key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    const b = this.cells.get(k);
    b ? b.push(e) : this.cells.set(k, [e]);
  }
  query(x, y, r, out = []) {
    const c = this.cell;
    for (let cx = Math.floor((x - r) / c); cx <= Math.floor((x + r) / c); cx++)
      for (let cy = Math.floor((y - r) / c); cy <= Math.floor((y + r) / c); cy++) {
        const b = this.cells.get(this.#key(cx, cy));
        if (b) for (const e of b) out.push(e);
      }
    return out;
  }
  #key(cx, cy) { return cx * 100003 + cy; }   // ponytail: collision-free for the 1920x1080 world
}
