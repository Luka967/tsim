import { Line } from './Line';
import { Point, TPoint } from './Point';

export class Segment extends Line {
    private readonly _length: number;
    private readonly _offset: Point;
    public get length(): number { return this._length; }

    public constructor(s: Point, e: Point) {
        super(s, e);
        this._offset = e.sub(s);
        this._length = this._offset.dist();
    }

    // I need to study vector math again
    // https://stackoverflow.com/questions/61341712/calculate-projected-point-location-x-y-on-given-line-startx-y-endx-y
    public closest(p: Point) {
        if (this._length === 0)
            // This segment contains only one point
            return new TPoint(this.s, 0);
        const dot = p.sub(this.s).dot(this._offset).div(this._length * this._length);
        const t = dot.x + dot.y;
        if (t <= 0)
            return new TPoint(this.s, 0);
        if (t >= 1)
            return new TPoint(this.e, 1);
        return new TPoint(this.s.add(this._offset.mul(dot)), t);
    }
    /**
     * Finds the segment's normal vector pointing to the left.
     */
    public normL() {
        // see https://www.desmos.com/calculator/14of8lqcbv
        return this.e.sub(this.s).rotate90cw();
    }
    /**
     * Finds the segment's normal vector pointing to the right.
     */
    public normR() {
        return this.e.sub(this.s).rotate90ccw();
    }

    public [Symbol.iterator](): Iterator<Point, Point, Point> {
        return [this.s, this.e][Symbol.iterator]();
    }
}
