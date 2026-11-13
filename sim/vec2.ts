export class Vec2 {
  constructor(public x = 0, public y = 0) {}
  add(o: Vec2) { return new Vec2(this.x + o.x, this.y + o.y); }
  sub(o: Vec2) { return new Vec2(this.x - o.x, this.y - o.y); }
  scale(s: number) { return new Vec2(this.x * s, this.y * s); }
  dot(o: Vec2) { return this.x * o.x + this.y * o.y; }
  mag2() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.mag2()); }
  norm() { const m = this.mag(); return m > 0 ? this.scale(1 / m) : new Vec2(); }
  clone() { return new Vec2(this.x, this.y); }
}