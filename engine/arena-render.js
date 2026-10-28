// Rendering helpers never consume combat RNG or mutate the simulation.
(function(root){
    'use strict';
    function intersects(bounds,x,y,margin=0){return !bounds||(x+margin>=bounds.left&&x-margin<=bounds.right&&y+margin>=bounds.top&&y-margin<=bounds.bottom);}
    // Conservative camera culling for transient power effects. Wide beams and
    // vertical pillars may cross the viewport from outside its bounds.
    function effectVisible(effect,bounds,x=effect.x,y=effect.y){
        if(!bounds)return true;
        switch(effect.type){
        case 'rasengan': return intersects(bounds,x,y,70);
        case 'titanQuake': return x+220>=bounds.left&&x-220<=bounds.right&&y+40>=bounds.top&&y-40<=bounds.bottom;
        case 'doubleJump': return intersects(bounds,x,y,55);
        case 'kamehameha':
            return y+75>=bounds.top && y-75<=bounds.bottom
                && (effect.dir===1 ? x<=bounds.right+75 : x>=bounds.left-75);
        case 'lightning':
            return x+32>=bounds.left && x-32<=bounds.right && y>=bounds.top-32;
        case 'ringOutPillar':
            return x+60>=bounds.left && x-60<=bounds.right && y>=bounds.top-30;
        default: return true; // Preserve unknown and future effect types.
        }
    }
    const budgets=Object.freeze({high:1800,balanced:900,performance:350});
    function drawParticles(ctx,particles,bounds,quality='balanced'){
        const stride=Math.max(1,Math.ceil(particles.length/(budgets[quality]||budgets.balanced)));
        for(let i=0;i<particles.length;i+=stride){const p=particles[i];if(!intersects(bounds,p.x,p.y,p.size))continue;
            ctx.fillStyle=p.color;ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
    }
    function createDiagnostics(capacity=240){
        const samples=Array.from({length:capacity},()=>({interval:0,simulation:0,drawing:0}));let count=0,next=0;
        const percentile=(values,p)=>values.length?values[Math.min(values.length-1,Math.floor(values.length*p))]:0;
        return Object.freeze({record(interval,simulation,drawing){Object.assign(samples[next],{interval,simulation,drawing});next=(next+1)%capacity;count=Math.min(count+1,capacity);},
            snapshot(){const rows=samples.slice(0,count),intervals=rows.map(r=>r.interval).filter(v=>v>0).sort((a,b)=>a-b);
                const stats=key=>{const a=rows.map(r=>r[key]).sort((a,b)=>a-b);return {meanMs:a.reduce((s,v)=>s+v,0)/(a.length||1),p95Ms:percentile(a,.95)};};
                return {samples:count,fps:intervals.length?1000/(intervals.reduce((s,v)=>s+v,0)/intervals.length):0,
                    frame:{p50Ms:percentile(intervals,.5),p95Ms:percentile(intervals,.95),p99Ms:percentile(intervals,.99)},simulation:stats('simulation'),drawing:stats('drawing')};}});
    }
    root.ArenaRender=Object.freeze({intersects,effectVisible,drawParticles,createDiagnostics,budgets});
})(globalThis);
