import { RoadLane } from './Road';

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
