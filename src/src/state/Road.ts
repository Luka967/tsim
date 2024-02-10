import type { Line } from '../geometry/Line';

export enum RoadLaneType {
    Car,
    Sidewalk,
    Barrier
}

export class RoadLane {
    public type: RoadLaneType;
    public width: number;
    public line: Line;
    public ghost: boolean;

    constructor(type: RoadLaneType, width: number, line: Line) {
        this.type = type;
        this.width = width;
        this.line = line;
        this.ghost = false;
    }
}

export enum RoadMarkingType {
    Full,
    Dashed,
    Dotted
}

export class RoadMarking {
    public readonly type: RoadMarkingType;
    public readonly left: RoadLane;
    public readonly right: RoadLane;

    constructor(l: RoadLane, r: RoadLane) {
        this.left = l;
        this.right = r;
    }
}

export class Road {
    public readonly lanes: readonly RoadLane[];
    public readonly markings: readonly RoadMarking[];
    public ghost: boolean;

    constructor(lanes: RoadLane[]) {
        this.lanes = lanes;
        this.ghost = false;
    }

    private _generateMarkings() {

    }
}
