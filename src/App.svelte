<script lang="ts">
import { onMount } from 'svelte';
import Simulation from './src/Simulation';
import { Point } from './src/geometry/Point';
import { Segment } from './src/geometry/Segment';

let canvas: HTMLCanvasElement;

let width: number,
    height: number;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
}
resize();

onMount(() => {
    const simulation = new Simulation(canvas);
    const draw = simulation.draw;

    function drawGrid() {
        draw.reset();
        let step = 40, i: number,
            cW = canvas.width / draw.camera.scale, cH = canvas.height / draw.camera.scale,
            startLeft = (-draw.camera.pos.x + cW / 2) % step,
            startTop = (-draw.camera.pos.y + cH / 2) % step;

        const ctx = simulation.draw.ctx;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = draw.color(0xAAAAAA);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        for (i = startLeft; i < cW; i += step) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, cH);
        }
        for (i = startTop; i < cH; i += step) {
            ctx.moveTo(0, i);
            ctx.lineTo(cW, i);
        }
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    function frame() {
        if (canvas == null)
            return void requestAnimationFrame(frame);
        simulation.controls.animatePanning();
        draw.reset();
        draw.clear();

        drawGrid();

        draw.cameraFocus();
        for (const lane of simulation.roadGraph.roads)
            draw.roadLane(lane);

        simulation.controls.draw();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
});
</script>

<svelte:document on:resize={resize} />

<canvas bind:this={canvas}
    {width} {height}
    on:contextmenu|preventDefault
></canvas>
