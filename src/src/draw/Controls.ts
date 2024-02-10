import type Simulation from '../Simulation';
import { Point } from '../geometry/Point';
import { Segment } from '../geometry/Segment';
import { RoadLane, RoadLaneType } from '../state/Road';
import type { RoadSnap } from '../state/RoadGraphSystem';
import type Draw from './Draw';

enum ControlState {
    /**
     * [Passive: no modifiers]
     * Declaring road start point
     */
    PaintRoadSpoint,
    /** Declaring road end point */
    PaintRoadEpoint,

    /** Dragging road start point */
    MoveRoadSpoint,
    /** Dragging road end point */
    MoveRoadEpoint,

    /**
     * [Passive: holding Ctrl]
     * Selecting road's control point
     */
    TryMoveRoad,
    /**
     * [Passive: holding Alt]
     * Delete snapped road
     */
    TryDeleteRoad
};
/** In these states no multi-click input has been triggered yet */
const passiveStates: readonly ControlState[] = [
    ControlState.PaintRoadSpoint,
    ControlState.TryMoveRoad,
    ControlState.TryDeleteRoad
];

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
    private _mousePanning: boolean;
    private _mousePoint: Point;
    private _mouseSnap: RoadSnap;
    private _modShift: boolean;
    private _modCtrl: boolean;
    private _modAlt: boolean;

    private _s_state: ControlState;
    private _s_paintRoad: RoadLane;
    private _s_moveRoad: RoadLane;
    private _s_deleteRoad: RoadLane;
    private _s_cameraDragLast: Point;
    private _s_cameraVelocity: Point;

    public get mousePoint() { return this._mousePoint; }
    public get state() { return this._s_state; }

    constructor(simulation: Simulation) {
        this.simulation = simulation;
        this._draw = this.simulation.draw;

        this._mouse = Point.zero;
        this._mousePanning = false;
        this._mousePoint = Point.zero;

        this._s_state = ControlState.PaintRoadSpoint;
        this._s_paintRoad = null;
        this._s_moveRoad = null;
        this._s_deleteRoad = null;
        this._s_cameraDragLast = null;
        this._s_cameraVelocity = Point.zero;

        const canvas = this.simulation.canvas;
        canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        document.body.addEventListener('keydown', this._onKeyChange.bind(this));
        document.body.addEventListener('keyup', this._onKeyChange.bind(this));
    }

    private _findLaneSnap(center: Point, ...ignore: RoadLane[]): RoadSnap | null {
        let closestProjection: Point = null,
            closestSqd: number,
            closestLane: RoadLane;

        for (const lane of this.simulation.roadGraph.roads) {
            if (lane.ghost || ignore.includes(lane))
                continue;
            const currentProjection = lane.line.closest(center);
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
    private _findLanePoint() {
        let closest: RoadLane = null,
            closestState: ControlState = null,
            closestSqd = +Infinity;
        for (const roadLane of this.simulation.roadGraph.roads) {
            const closestPoint = [...roadLane.line]
                .map((p, i) => ({
                    p, sqd: this._mousePoint.sub(p).distSq(),
                    state: ControlState.MoveRoadSpoint + i
                }));
            closestPoint.sort((a, b) => a.sqd - b.sqd);
            if (closestPoint[0].sqd > closestSqd)
                continue;
            closest = roadLane;
            closestState = closestPoint[0].state;
            closestSqd = closestPoint[0].sqd;
        }
        if (closest == null || closestSqd > closest.width * closest.width)
            return null;
        return { closest, closestState, closestSqd };
    }

    private _updateMousePoint(ev?: MouseEvent) {
        if (ev != null)
            this._mouse = new Point(ev.clientX, ev.clientY);
        this._mousePoint = this.simulation.draw.cameraPoint(this._mouse);
        this._mouseSnap = null;
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadEpoint:
            if (!this._modShift)
                this._mouseSnap = this._findLaneSnap(this._mousePoint, this._s_moveRoad);
            break;
        default:
            if (!this._modShift)
                this._mouseSnap = this._findLaneSnap(this._mousePoint);
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
            ? this._mousePoint : this._s_moveRoad.line.s;
        const e = this._s_state === ControlState.MoveRoadEpoint
            ? this._mousePoint : this._s_moveRoad.line.e;
        this._s_moveRoad.line = new Segment(s, e);
    }
    private _s_paintRoadUpdate() {
        this._s_paintRoad.line = new Segment(
            this._s_paintRoad.line.s,
            this._mousePoint
        );
    }
    private _s_cameraDragUpdate() {
        const camera = this.simulation.draw.camera;
        camera.pos = camera.pos.add(this._s_cameraDragLast.sub(this._mouse));
        this._s_cameraVelocity = this._s_cameraDragLast.sub(this._mouse).mul(5);
        this._s_cameraDragLast = this._mouse;
        this._mousePanning = true;
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
        case ControlState.TryDeleteRoad:
            if (this._s_deleteRoad == null)
                break;
            this.simulation.roadGraph.roads.splice(
                this.simulation.roadGraph.roads.indexOf(this._s_deleteRoad),
                1
            );
            this._s_deleteRoad = null;
            break;
        case ControlState.TryMoveRoad:
            const moveRoadQuery = this._findLanePoint();
            if (moveRoadQuery == null)
                break;
            this._s_moveRoad = moveRoadQuery.closest;
            this._s_state = moveRoadQuery.closestState;
            break;
        case ControlState.PaintRoadSpoint:
            this._s_paintRoad = new RoadLane(
                RoadLaneType.Car,
                defaultRoadLaneWidth(RoadLaneType.Car),
                new Segment(
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
        this._mousePanning = false;

        if (ev.button === 0)
            this._onMouseUpPrimary();
        else if (ev.button === 2)
            this._onMouseUpSecondary();
    }
    private _onMouseUpPrimary() {
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadEpoint:
            this._s_MoveRoadUpdate();
            this._s_moveRoad.ghost = false;
            // const parallel = new RoadLane(RoadLaneType.Car, 40, this._s_moveRoad.line.offset(+40));
            // this.simulation.roadGraph.roads.push(parallel);
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

        // Incase state changes
        if (this._s_deleteRoad != null)
            this._s_deleteRoad = null;

        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadEpoint:
            this._s_MoveRoadUpdate();
            break;
        case ControlState.PaintRoadEpoint:
            this._s_paintRoadUpdate();
            break;
        case ControlState.TryDeleteRoad:
            if (this._mouseSnap?.snap)
                this._s_deleteRoad = this._mouseSnap.onto;
            break;
        }
    }

    private _onKeyChange(ev: KeyboardEvent) {
        this._modCtrl = ev.ctrlKey;
        this._modShift = ev.shiftKey;
        this._modAlt = ev.altKey;
        this._updateMousePoint();

        if (!passiveStates.includes(this._s_state))
            return;
        // Change passive state
        if (this._modAlt)
            this._s_state = ControlState.TryDeleteRoad;
        else if (this._modCtrl)
            this._s_state = ControlState.TryMoveRoad;
        else
            this._s_state = ControlState.PaintRoadSpoint;
    }

    private _drawRoadPoints(roadLane: RoadLane) {
        const points = [...roadLane.line];
        let i = 0;
        this._draw.point(points[i++], 0xff0000, 20);
        for (; i < points.length - 1; i++)
            this._draw.point(points[i], 0xffff00, 20);
        this._draw.point(points[i], 0x0000ff, 20);
    }
    private _drawSnap() {
        if (this._mouseSnap == null)
            return;
        this._drawRoadPoints(this._mouseSnap.onto);
    }
    public animatePanning() {
        if (this._s_cameraVelocity.distSq() <= 0.1 * 0.1) {
            this._s_cameraVelocity = Point.zero;
            return;
        }
        if (!this._mousePanning) {
            const camera = this.simulation.draw.camera;
            this.simulation.draw.camera.pos = camera.pos.add(this._s_cameraVelocity);
        }
        this._s_cameraVelocity = this._s_cameraVelocity.mul(0.9);
    }
    public draw() {
        switch (this._s_state) {
        case ControlState.MoveRoadSpoint:
        case ControlState.MoveRoadEpoint:
            this._drawRoadPoints(this._s_moveRoad);
            this._drawSnap();
            break;
        case ControlState.PaintRoadSpoint:
            if (this._modCtrl)
                for (const roadLane of this.simulation.roadGraph.roads)
                    this._drawRoadPoints(roadLane);
            else this._drawSnap();

            let drawMouse = true;
            if (this._modCtrl)
                drawMouse = this._findLanePoint() == null;

            if (drawMouse)
                this._draw.point(this._mousePoint, 0xff0000, 20);
            break;
        case ControlState.PaintRoadEpoint:
            this._drawSnap();
            this._draw.roadLane(this._s_paintRoad);
            this._drawRoadPoints(this._s_paintRoad);
        case ControlState.TryDeleteRoad:
            if (this._s_deleteRoad != null)
                this._drawRoadPoints(this._s_deleteRoad);
            break;
        }
    }
}
