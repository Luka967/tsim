export class Point {
    public readonly x: number;
    public readonly y: number;

    public constructor(v: Point);
    public constructor(x: number, y: number);
    public constructor(x: number | Point, y: number = null) {
        if (x instanceof Point) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    public static readonly zero     = new Point( 0,  0);
    public static readonly one      = new Point(+1, +1);
    public static readonly up       = new Point( 0, -1);
    public static readonly down     = new Point( 0, +1);
    public static readonly left     = new Point(-1,  0);
    public static readonly right    = new Point(+1,  0);

    public add(v: Point): Point;
    public add(x: number, y: number): Point;
    public add(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x + x.x, this.y + x.y);
        else
            return new Point(this.x + x, this.y + y);
    }
    public sub(v: Point): Point;
    public sub(x: number, y: number): Point;
    public sub(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x - x.x, this.y - x.y);
        else
            return new Point(this.x - x, this.y - y);
    }
    public mul(v: Point): Point;
    public mul(c: number): Point;
    public mul(x: number, y: number): Point;
    public mul(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x * x.x, this.y * x.y);
        else
            return new Point(this.x * x, this.y * (y ?? x));
    }
    public div(v: Point): Point;
    public div(c: number): Point;
    public div(x: number, y: number): Point;
    public div(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x / x.x, this.y / x.y);
        else
            return new Point(this.x / x, this.y / (y ?? x));
    }
    public dot(v: Point): Point;
    public dot(x: number, y: number): Point;
    public dot(x: number | Point, y: number = null): Point {
        if (x instanceof Point)
            return new Point(this.x * x.x, this.y * x.y);
        else
            return new Point(this.x * x, this.y * y);
    }
    public neg() {
        return new Point(-this.x, -this.y);
    }
    public inv() {
        return new Point(1 / this.x, 1 / this.y);
    }
    /**
     * Rotation anchor is coordinate zero
     */
    public rotate90ccw() {
        return new Point(-this.y, this.x);
    }
    /**
     * Rotation anchor is coordinate zero
     */
    public rotate90cw() {
        return new Point(this.y, -this.x);
    }
    public norm(d: number = 1) {
        return this.div(this.dist() / d);
    }

    public distSq() {
        return this.x * this.x + this.y * this.y;
    }
    public dist() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    /**
     * @returns Interval between -PI..PI
     */
    public angle() {
        return Math.atan2(-this.y, this.x);
    }
    /**
     * @returns Interval between 0..2PI
     */
    public angletau() {
        const v = Math.atan2(-this.y, this.x);
        if (v < 0) return Math.PI - v;
        return v;
    }

    public clone() {
        return new Point(this);
    }

    /**
     * Calculates line intersection, if exists
     */
    public static lineintx(p1s: Point, p1e: Point, p2s: Point, p2e: Point) {
        // http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
        // I need to figure out how this works
        const p1v = p1e.sub(p1s);
        const p2v = p2e.sub(p2s);
        const denominator = (p2v.y * p1v.x) - (p2v.x * p1v.y);
        if (denominator == 0)
            return null;
        let a = p1s.y - p2s.y,
            b = p1s.x - p2s.x;
        const numerator1 = (p2v.x * a) - (p2v.y * b),
            numerator2 = (p1v.x * a) - (p1v.y * b);
        a = numerator1 / denominator;
        b = numerator2 / denominator;

        return new PointIntx(
            p1s.add(p1v.mul(a)),
            a > 0 && a < 1,
            b > 0 && b < 1
        );
    }
}

/**
 * Represents a point on curve with t-value further specified.
 *
 * T-value is lost after any modifying operation
 */
export class TPoint extends Point {
    public readonly t: number;

    public constructor(v: Point, t: number);
    public constructor(x: number, y: number, t: number);
    public constructor(x: number | Point, y: number, t?: number) {
        if (x instanceof Point) {
            super(x);
            this.t = y;
        } else {
            super(x, y);
            this.t = t;
        }
    }
}

/**
 * Represents a raycast intersection result between two lines.
 *
 * {@link PointIntx.on1} and {@link PointIntx.on2} specify on which line the point lies, if any.
 *
 * These booleans are lost after any modifying operation
 */
export class PointIntx extends Point {
    public readonly on1: boolean;
    public readonly on2: boolean;

    public constructor(v: Point, on1: boolean, on2: boolean) {
        super(v);
        this.on1 = on1;
        this.on2 = on2;
    }
}
