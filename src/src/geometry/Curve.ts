
import Constant from '../Constant';
import { Line } from './Line';
import { Point, TPoint } from './Point';

export abstract class Curve extends Line {
    private readonly _length: number;
    public get length(): number { return this._length; }

    protected _lut: Point[];
    /** Point lookup table for time parameter */
    public get lut() { return this._lut as readonly Point[]; }

    public constructor(s: Point, e: Point) {
        super(s, e);
        let length = 0;
        for (let i = 1; i < Constant.CURVE_LUT_POINTS; i++)
            length += this._lut[i].sub(this._lut[i - 1]).dist();
        this._length = length;
    }

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

    /**
     * Calculates normal of curve, normal goes to the left side
     */
    public normL(t: number) {
        return this.atd(t).rotate90ccw().norm();
    }
    /**
     * Calculates normal of curve, normal goes to the right side
     */
    public normR(t: number) {
        return this.atd(t).rotate90cw().norm();
    }

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

        return new QuadraticCurve(sOffset, intx, eOffset);
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
