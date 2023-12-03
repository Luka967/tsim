import { Point, QuadraticCurve } from '../Geometry';
import type Simulation from '../Simulation';
import { RoadLane, RoadLaneType } from '../state/RoadGraph';
import type { RoadSnap } from '../state/RoadGraphSystem';
import type Draw from './Draw';

enum ControlState {
    /** Creating road: declaring start point */
    PaintRoadSpoint,
    /** Creating road: declaring end point */
    PaintRoadEpoint,

    /** Moving road: dragging start point */
    MoveRoadSpoint,
    /** Moving road: dragging control point */
    MoveRoadCpoint,
    /** Moving road: dragging end point */
    MoveRoadEpoint
};

function defaultRoadLaneWidth(type: RoadLaneType) {
    switch (type) {
        case RoadLaneType.Car: return 40;
        case RoadLaneType.Barrier: return 50;
        case RoadLaneType.Sidewalk: return 20;
    }
}

export default class Controls {
    public readonly simulation: Simulation;
    public readonly _draw: Draw;

    private _mouse: Point;
    private _mousePoint: Point;
    private _mouseSnap: RoadSnap;
    private _modShift: boolean;
    private _modCtrl: boolean;
    private _modAlt: boolean;

    private _s_state: ControlState;
    private _s_paintRoad: RoadLane;
    private _s_moveRoad: RoadLane;
    private _s_cameraDragLast: Point;
    private _s_cameraVelocity: Point;

    public get mousePoint() { return this._mousePoint; }
    public get state() { return this._s_state; }

    constructor(simulation: Simulation) {
        this.simulation = simulation;
        this._draw = this.simulation.draw;

        this._mouse = Point.zero;
        this._mousePoint = Point.zero;

        this._s_state = ControlState.PaintRoadSpoint;
        this._s_paintRoad = null;
        this._s_moveRoad = null;
        this._s_cameraDragLast = null;
        this._s_cameraVelocity = Point.zero;

        const canvas = this.simulation.canvas;
        canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        document.body.addEventListener('keydown', this._onKeyChange.bind(this));
        document.body.addEventListener('keyup', this._onKeyChange.bind(this));
    }

    private _updateMouseTrySnap(center: Point, ...ignore: RoadLane[]): RoadSnap | null {
        let closestProjection: Point = null,
            closestSqd: number,
            closestLane: RoadLane;

        for (const lane of this.simulation.roadGraph.roads) {
            if (lane.ghost || ignore.includes(lane))
                continue;
            const currentProjection = lane.curve.project(center);
            const currentSqd = currentProjection.sub(center).distSq();
            if (closestProjection != null && currentSqd >= closestSqd)
                continue;
            closestProjection = currentProjection;
            closestSqd = currentSqd;
            closestLane = lane;
        }
        if (closestLane == null)
            // No road lanes
            return null;
        const dSnap = closestLane.width * closestLane.width / 4;
        if (closestSqd > dSnap * 8)
            // No collision
            return null;
        if (closestSqd < dSnap)
            // Snap collision
            return { p: closestProjection, onto: closestLane, snap: true };
        // Move projection toward point by width of road lane
        return {
            p: closestProjection.add(center.sub(closestProjection).norm(closestLane.width)),
            onto: closestLane,
            snap: false
        };
    }

    private _updateMousePoint(ev?: MouseEvent) {
        if (ev != null)
            this._mouse = new Point(ev.clientX, ev.clientY);
        this._mousePoint = this.simulation.draw.cameraPoint(this._mouse);
        this._mouseSnap = null;
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadCpoint:
        case ControlState.MoveRoadEpoint:
            if (!this._modShift)
                this._mouseSnap = this._updateMouseTrySnap(this._mousePoint, this._s_moveRoad);
            break;
        default:
            if (!this._modShift)
                this._mouseSnap = this._updateMouseTrySnap(this._mousePoint);
            break;
        }
        if (this._mouseSnap != null)
            this._mousePoint = this._mouseSnap.p;
        else
            this._mousePoint = new Point(
                Math.floor(this._mousePoint.x / 40),
                Math.floor(this._mousePoint.y / 40)
            ).mul(40).add(20, 20);
    }
    private _s_MoveRoadUpdate() {
        const s = this._s_state === ControlState.MoveRoadSpoint
            ? this._mousePoint : this._s_moveRoad.curve.s;
        const c = this._s_state === ControlState.MoveRoadCpoint
            ? this._mousePoint : this._s_moveRoad.curve.c;
        const e = this._s_state === ControlState.MoveRoadEpoint
            ? this._mousePoint : this._s_moveRoad.curve.e;
        this._s_moveRoad.curve = new QuadraticCurve(s, c, e);
    }
    private _s_paintRoadUpdate() {
        this._s_paintRoad.curve = new QuadraticCurve(
            this._s_paintRoad.curve.s,
            this._s_paintRoad.curve.s.add(this._mousePoint).div(2),
            this._mousePoint
        );
    }
    private _s_cameraDragUpdate() {
        const camera = this.simulation.draw.camera;
        camera.pos = camera.pos.add(this._s_cameraDragLast.sub(this._mouse));
        this._s_cameraDragLast = this._mouse;
    }

    private _onMouseDown(ev: MouseEvent) {
        this._updateMousePoint(ev);

        if (ev.button === 0)
            this._onMouseDownPrimary();
        else if (ev.button === 2)
            this._onMouseDownSecondary();
    }
    private _onMouseDownPrimary() {
        switch (this._s_state) {
        case ControlState.PaintRoadEpoint:
            this._s_paintRoadUpdate();
            this._s_paintRoad.ghost = false;
            this.simulation.roadGraph.roads.push(this._s_paintRoad);
            this._s_paintRoad = null;
            this._s_state = ControlState.PaintRoadSpoint;
            break;
        case ControlState.PaintRoadSpoint:
            if (this._mouseSnap?.snap) {
                const road = this._mouseSnap.onto;
                const dlist = [
                    { d: road.curve.s.sub(this._mousePoint).distSq(), go: ControlState.MoveRoadSpoint },
                    { d: road.curve.c.sub(this._mousePoint).distSq(), go: ControlState.MoveRoadCpoint },
                    { d: road.curve.e.sub(this._mousePoint).distSq(), go: ControlState.MoveRoadEpoint },
                ];
                dlist.sort((a, b) => a.d - b.d);
                if (dlist[0].d <= road.width * road.width) {
                    this._s_moveRoad = road;
                    this._s_state = dlist[0].go;
                    break;
                }
            }
            this._s_paintRoad = new RoadLane(
                RoadLaneType.Car,
                defaultRoadLaneWidth(RoadLaneType.Car),
                new QuadraticCurve(
                    this._mousePoint,
                    this._mousePoint,
                    this._mousePoint
                )
            );
            this._s_paintRoad.ghost = true;
            this._s_state = ControlState.PaintRoadEpoint;
            break;
        default:
            break;
        }
    }
    private _onMouseDownSecondary() {
        this._s_cameraDragLast = this._mouse;
    }

    private _onMouseUp(ev: MouseEvent) {
        this._updateMousePoint(ev);

        if (ev.button === 0)
            this._onMouseUpPrimary();
        else if (ev.button === 2)
            this._onMouseUpSecondary();
    }
    private _onMouseUpPrimary() {
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadCpoint:
        case ControlState.MoveRoadEpoint:
            this._s_MoveRoadUpdate();
            this._s_moveRoad.ghost = false;
            this._s_state = ControlState.PaintRoadSpoint;
            break;
        }
    }
    private _onMouseUpSecondary() {
        this._s_cameraDragLast = null;
    }

    private _onMouseMove(ev: MouseEvent) {
        this._updateMousePoint(ev);

        if (this._s_cameraDragLast != null)
            this._s_cameraDragUpdate();

        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadCpoint:
        case ControlState.MoveRoadEpoint:
            this._s_MoveRoadUpdate();
            break;
        case ControlState.PaintRoadEpoint:
            this._s_paintRoadUpdate();
            break;
        }
    }

    private _onKeyChange(ev: KeyboardEvent) {
        this._modCtrl = ev.ctrlKey;
        this._modShift = ev.shiftKey;
        this._modAlt = ev.altKey;
        this._updateMousePoint();
    }

    private _drawRoadPoints(roadLane: RoadLane) {
        this._draw.point(roadLane.curve.s, 0xff0000, 20);
        this._draw.point(roadLane.curve.c, 0xffff00, 20);
        this._draw.point(roadLane.curve.e, 0x0000ff, 20);
    }
    private _drawSnap() {
        if (this._mouseSnap == null)
            return;
        this._drawRoadPoints(this._mouseSnap.onto);
    }
    public draw() {
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadCpoint:
        case ControlState.MoveRoadEpoint:
            this._drawRoadPoints(this._s_moveRoad);
            this._drawSnap();
            break;
        case ControlState.PaintRoadSpoint:
            this._drawSnap();
            this._draw.point(this._mousePoint, 0xff0000, 20);
            break;
        case ControlState.PaintRoadEpoint:
            this._drawSnap();
            this._draw.roadLane(this._s_paintRoad);
            this._drawRoadPoints(this._s_paintRoad);
            break;
        }
    }
}
