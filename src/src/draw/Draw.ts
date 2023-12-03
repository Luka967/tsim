import { Point } from '../Geometry';
import { RoadLaneType, type RoadLane } from '../state/RoadGraph';

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
        return this;
    }
}
