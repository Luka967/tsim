import type { Point } from '../Geometry';
import { RoadGraph, RoadLane } from './RoadGraph';

export interface RoadSnap {
    p: Point;
    onto: RoadLane;
    snap: boolean;
}

export default class RoadGraphSystem extends RoadGraph {
    constructor() {
        super();
    }
}
