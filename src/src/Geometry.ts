import Constant from './Constant';

export class Point {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number | Point, y: number = null) {
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

    public add(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x + x.x, this.y + x.y);
        else
            return new Point(this.x + x, this.y + y);
    }
    public sub(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x - x.x, this.y - x.y);
        else
            return new Point(this.x - x, this.y - y);
    }
    public mul(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x * x.x, this.y * x.y);
        else
            return new Point(this.x * x, this.y * (y ?? x));
    }
    public div(x: number | Point, y: number = null) {
        if (x instanceof Point)
            return new Point(this.x / x.x, this.y / x.y);
        else
            return new Point(this.x / x, this.y / (y ?? x));
    }
    public neg() {
        return new Point(-this.x, -this.y);
    }
    public inv() {
        return new Point(1 / this.x, 1 / this.y);
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
    public angle() {
        return Math.atan2(-this.y, this.x);
    }
    public angletau() {
        const v = Math.atan2(-this.y, this.x);
        if (v < 0) return Math.PI - v;
        return v;
    }

    public clone() {
        return new Point(this);
    }
}

export abstract class Curve implements Iterable<Point> {
    /** Start point */
    public readonly s: Point;
    /** End point */
    public readonly e: Point;

    public constructor(s: Point, e: Point) {
        this.s = s;
        this.e = e;
        this._lut = [];
    }

    /** Point lookup table for time parameter */
    protected readonly _lut: Point[];
    /** Computes point on curve at specific time parameter */
    public abstract at(t: number): Point;

    protected _rebuildLut() {
        this._lut.splice(0, this._lut.length);
        this._lut.push(this.s);
        // Todo: Reparametrize t for uniform distance between points
        for (let i = 1; i <= Constant.CURVE_LUT_POINTS - 1; i++)
            this._lut.push(this.at(i / Constant.CURVE_LUT_POINTS));
        this._lut.push(this.e);
    }

    public abstract [Symbol.iterator](): Iterator<Point, Point, Point>;

    public project(p: Point): Point {
        let ci = 0, csqd = +Infinity, cv: Point;
        for (let i = 0; i < this._lut.length; i++) {
            const Cv = this._lut[i].sub(p);
            const Csqd = Cv.distSq();
            if (Cv.distSq() >= csqd) continue;
            ci = i; csqd = Csqd; cv = Cv;
        }

        // Narrow the accuracy with binary search
        // We figured out where the center of our search is.
        // The leftmost and rightmost points are a half step away from adjacent LUT indices
        let tl = Math.max(ci / Constant.CURVE_LUT_POINTS - 0.5 * (1 / Constant.CURVE_LUT_POINTS), 0),
            tr = Math.min(ci / Constant.CURVE_LUT_POINTS + 0.5 * (1 / Constant.CURVE_LUT_POINTS), 1);

        while (true) {
            const middle = (tl + tr) / 2;
            const quarterseg = (tr - tl) / 2;
            if (quarterseg * 2 <= Constant.CURVE_PROJECT_T_EPSILON)
                return this.at(middle);

            // Take center, offset by quarter. That's the middle of next search
            const ml = this.at(middle - quarterseg),
                mr = this.at(middle + quarterseg);
            if (ml.sub(p).distSq() < mr.sub(p).distSq())
                tr = middle;
            else
                tl = middle;
        }
    }
}

/** Quadratic Bezier curve */
export class QuadraticCurve extends Curve {
    /** Control point */
    public readonly c: Point;

    constructor(s: Point, c: Point, e: Point) {
        super(s, e);
        this.c = c;
        this._rebuildLut();
    }

    public at(t: number) {
        // https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Specific_cases
        // Explicit forms have the least calls
        return this.s.mul(Math.pow(1 - t, 2))
            .add(this.c.mul(2 * (1 - t) * t))
            .add(this.e.mul(t * t));
    }

    public [Symbol.iterator]() {
        return [this.s, this.c, this.e][Symbol.iterator]();
    }
}

// Is it even needed?
/** Cubic Bezier curve */
export class CubicCurve extends Curve {
    /** Control point 1 */
    public readonly cl: Point;
    /** Control point 2 */
    public readonly cr: Point;

    constructor(s: Point, cl: Point, cr: Point, e: Point) {
        super(s, e);
        this.cl = cl;
        this.cl = cr;
        this._rebuildLut();
    }

    public at(t: number) {
        return this.s.mul(Math.pow(1 - t, 3))
            .add(this.cl.mul(3 * Math.pow(1 - t, 2) * t))
            .add(this.cr.mul(3 * (1 - t) * t * t))
            .add(this.e.mul(t * t * t));
    }

    public [Symbol.iterator]() {
        return [this.s, this.cl, this.cr, this.e][Symbol.iterator]();
    }
}
