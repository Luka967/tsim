import Constant from './Constant';

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

export abstract class Curve implements Iterable<Point> {
    /** Start point */
    public readonly s: Point;
    /** End point */
    public readonly e: Point;

    public constructor(s: Point, e: Point) {
        this.s = s;
        this.e = e;
    }

    protected _lut: Point[];
    /** Point lookup table for time parameter */
    public get lut() { return this._lut as readonly Point[]; }

    /**
     * Computes point on curve at specific time parameter
     */
    public abstract at(t: number): Point;
    /**
     * Computes derivative of curve at specific time parameter. Useful in finding normals
     */
    public abstract atd(t: number): Point;

    protected _buildLut() {
        const list: Point[] = [];
        list.push(this.s);
        // 0 is start, 1 is end
        for (let i = 1; i <= Constant.CURVE_LUT_POINTS - 1; i++)
            list.push(this.at(i / Constant.CURVE_LUT_POINTS));
        list.push(this.e);
        return list;
    }

    public abstract [Symbol.iterator](): Iterator<Point, Point, Point>;

    /**
     * Calculates normal of curve, normal goes to the left side
     */
    public normL(t: number) {
        return this.atd(t).rotate90ccw().norm();
    }
    /**
     * Calculates normal of curve, normal goes to the left side
     */
    public normR(t: number) {
        return this.atd(t).rotate90cw().norm();
    }

    /**
     * Finds curve point closest to specified, ie. projects point to curve.
     * @returns The point and its t-value
     */
    public closest(p: Point) {
        let ci = 0, csqd = +Infinity, cv: Point;
        for (let i = 0; i < this.lut.length; i++) {
            const Cv = this.lut[i].sub(p);
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
                return new TPoint(this.at(middle), middle);

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
        this._lut = this._buildLut();
    }

    public at(t: number) {
        // https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Specific_cases
        // Explicit forms have the least calls
        return this.s.mul(Math.pow(1 - t, 2))
            .add(this.c.mul(2 * (1 - t) * t))
            .add(this.e.mul(t * t));
    }
    public atd(t: number): Point {
        return this.c.sub(this.s).mul(2 * (1 - t))
            .add(this.e.sub(this.c).mul(2 * t));
    }

    /**
     * Tiller and Hanson method - drags the control polygon to the left by specified distance.
     *
     * This gets progressively inaccurate as the inside angle is sharper
     *
     * @returns Array of connected {@link QuadraticCurve} instances
     */
    public offset(d: number) {
        // https://math.stackexchange.com/questions/465782/control-points-of-offset-bezier-curve
        // https://math.stackexchange.com/questions/3092244/how-to-perfectly-split-a-bezier-curve-into-two-curves-of-unequal-length
        // https://gershon.cs.technion.ac.il/papers/offset-compare.pdf

        // Begin with start and end offset
        const sOffset = this.s.add(this.normL(0).mul(d));
        const eOffset = this.e.add(this.normL(1).mul(d));

        // then we find normal toward middle
        const sNorm = this.c.sub(this.s).norm(d);
        const eNorm = this.e.sub(this.c).norm(d);

        // and we raycast them. Wherever the intersection point is will be our new control point
        const intx = Point.lineintx(sOffset, sOffset.add(sNorm), eOffset, eOffset.add(eNorm));

        return new QuadraticCurve(
            this.s.add(this.normL(0).mul(d)),
            intx,
            this.e.add(this.normL(1).mul(d))
        );
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
        this._lut = this._buildLut();
    }

    public at(t: number) {
        return this.s.mul(Math.pow(1 - t, 3))
            .add(this.cl.mul(3 * Math.pow(1 - t, 2) * t))
            .add(this.cr.mul(3 * (1 - t) * t * t))
            .add(this.e.mul(t * t * t));
    }
    public atd(t: number): Point {
        return this.cl.sub(this.s).mul(3 * Math.pow(1 - t, 2))
            .add(this.cr.sub(this.cl).mul(6 * (1 - t) * t))
            .add(this.e.sub(this.cr).mul(3 * Math.pow(t, 3)));
    }

    public [Symbol.iterator]() {
        return [this.s, this.cl, this.cr, this.e][Symbol.iterator]();
    }
}
