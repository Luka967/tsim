import type { QuadraticCurve } from '../Geometry';

export enum RoadLaneType {
    Car,
    Sidewalk,
    Barrier
}

export class RoadLane {
    public type: RoadLaneType;
    public width: number;
    public curve: QuadraticCurve;

    constructor(type: RoadLaneType, width: number, curve: QuadraticCurve) {
        this.type = type;
        this.width = width;
        this.curve = curve;
    }
}

export class Road {
    public readonly lanes: readonly RoadLane[];
    public ghost: boolean;

    constructor(lanes: RoadLane[]) {
        this.lanes = lanes;
        this.ghost = false;
    }
}
