import Constant from '../Constant';
import { Point } from '../Geometry';
import { RoadLaneType, type RoadLane } from '../state/Road';

export default class Draw {
    public readonly ctx: CanvasRenderingContext2D;

    public readonly camera: {
        pos: Point;
        scale: number;
    } = {
        pos: Point.zero,
        scale: 1
    };

    private _alphaApplied: boolean;

    public constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this._alphaApplied = false;
    }

    public reset() {
        this.ctx.reset();
    }
    public clear() {
        this.ctx.reset();
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        return this;
    }
    public cameraFocus() {
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.pos.x, -this.camera.pos.y);
        return this;
    }
    public cameraPoint(p: Point) {
        return p.sub(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2)
            .div(this.camera.scale)
            .add(this.camera.pos);
    }

    public color(number: number) {
        return `#${number.toString(16).padStart(6, '0')}`;
    }
    public colorRoadLane(roadLane: RoadLane) {
        switch (roadLane.type) {
            case RoadLaneType.Car: return this.color(0xa9a9a9);
            case RoadLaneType.Barrier: return this.color(0x4a4a4a);
            case RoadLaneType.Sidewalk: return this.color(0x6a6a6a);
        }
    }

    public alpha(v: number = 1) {
        if (this._alphaApplied) {
            this.ctx.restore();
            this._alphaApplied = false;
        }
        if (v === 1)
            return this;
        this.ctx.save();
        this.ctx.globalAlpha = v;
        this._alphaApplied = true;
        return this;
    }

    public point(v: Point, color: number, radius = 20) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.fillStyle = this.color(color);
        this.ctx.arc(v.x, v.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        return this;
    }
    public roadLane(v: RoadLane) {
        if (v.ghost)
            this.alpha(0.5);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.lineWidth = v.width;
        this.ctx.strokeStyle = this.colorRoadLane(v);
        this.ctx.lineTo(v.curve.s.x, v.curve.s.y);
        this.ctx.quadraticCurveTo(v.curve.c.x, v.curve.c.y, v.curve.e.x, v.curve.e.y);
        this.ctx.stroke();
        this.ctx.restore();
        if (Constant.DRAW_CURVE_LUT)
            for (const point of v.curve.lut)
                this.point(point, 0x000000, v.width / 16);
        if (Constant.DRAW_CURVE_LUT_NORM) {
            this.ctx.save();
            this.ctx.lineWidth = v.width / 32;
            this.ctx.strokeStyle = this.color(0x000000);
            for (let i = 0; i <= Constant.CURVE_LUT_POINTS; i++) {
                const normL = v.curve.normL(i / Constant.CURVE_LUT_POINTS).mul(v.width / 2);
                const l = v.curve.lut[i].add(normL),
                    r = v.curve.lut[i].sub(normL);
                this.ctx.beginPath();
                this.ctx.moveTo(l.x, l.y);
                this.ctx.lineTo(r.x, r.y);
                this.ctx.closePath();
                this.ctx.stroke();
            }
            this.ctx.restore();
        }
        if (Constant.DRAW_CURVE_POLY) {
            this.point(v.curve.s, 0x000000, v.width / 4);
            this.point(v.curve.c, 0x000000, v.width / 4);
            this.point(v.curve.e, 0x000000, v.width / 4);
            this.ctx.save();
            this.ctx.lineWidth = v.width / 32;
            this.ctx.strokeStyle = this.color(0x000000);
            this.ctx.beginPath();
            this.ctx.moveTo(v.curve.s.x, v.curve.s.y);
            this.ctx.lineTo(v.curve.c.x, v.curve.c.y);
            this.ctx.lineTo(v.curve.e.x, v.curve.e.y);
            this.ctx.stroke();
            this.ctx.restore();
        }
        return this;
    }
}
