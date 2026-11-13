export class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}

  add(o: Vec2): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }

  sub(o: Vec2): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(o: Vec2): number {
    return this.x * o.x + this.y * o.y;
  }

  mag2(): number {
    return this.x * this.x + this.y * this.y;
  }

  mag(): number {
    return Math.sqrt(this.mag2());
  }

  norm(): Vec2 {
    const m = this.mag();
    return m > 0 ? this.scale(1 / m) : new Vec2();
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
