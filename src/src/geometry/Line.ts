import { TPoint, type Point } from './Point';

export abstract class Line implements Iterable<Point> {
    /** Start point */
    public readonly s: Point;
    /** End point */
    public readonly e: Point;
    /** The line's length */
    public abstract get length(): number;

    protected constructor(s: Point, e: Point) {
        this.s = s;
        this.e = e;
    }

    public abstract [Symbol.iterator](): Iterator<Point, Point, Point>;

    /**
     * Finds point on line closest to specified, ie. projects point to line.
     * @returns The point and its t-value
     */
    public abstract closest(p: Point): TPoint;

    /**
     * Finds normal at specified t-value that goes to the left.
     * @returns A normalized vector
     */
    public abstract normL(t: number): Point;
    /**
     * Finds normal at specified t-value that goes to the right.
     * @returns A normalized vector
     */
    public abstract normR(t: number): Point;
}
