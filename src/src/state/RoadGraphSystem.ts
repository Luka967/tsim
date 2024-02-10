import type { Point } from '../geometry/Point';
import { RoadLane } from './Road';
import { RoadGraph } from './RoadGraph';

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
