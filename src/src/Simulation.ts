import Controls from './draw/Controls';
import Draw from './draw/Draw';
import RoadGraphSystem from './state/RoadGraphSystem';

export default class Simulation {
    public readonly canvas: HTMLCanvasElement;
    public readonly draw: Draw;
    public readonly controls: Controls;

    public readonly roadGraph: RoadGraphSystem;

    constructor(canvas: HTMLCanvasElement = null) {
        this.canvas = canvas;
        this.roadGraph = new RoadGraphSystem();
        if (canvas != null) {
            this.draw = new Draw(canvas.getContext('2d'));
            this.controls = new Controls(this);
        }
    }

    public frame() {

    }
}
