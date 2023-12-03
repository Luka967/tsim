import type { QuadraticCurve } from '../Geometry';

export class RoadGraph {
    public readonly roads: RoadLane[];
    public readonly junctions: RoadJunction[];

    constructor() {
        this.roads = [];
        this.junctions = [];
    }
}

export class RoadJunction {
    public readonly connected: RoadLane[];

    constructor() {
        this.connected = [];
    }
}

export enum RoadLaneType {
    Car,
    Sidewalk,
    Barrier
};

export class RoadLane {
    public type: RoadLaneType;
    public width: number;
    public curve: QuadraticCurve;
    public ghost: boolean;

    constructor(type: RoadLaneType, width: number, curve: QuadraticCurve) {
        this.type = type;
        this.width = width;
        this.curve = curve;
        this.ghost = false;
    }
}
