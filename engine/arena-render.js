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
            if(effect.dirY)return x+75>=bounds.left && x-75<=bounds.right
                && (effect.dirY<0 ? y>=bounds.top-75 : y<=bounds.bottom+75);
            return y+75>=bounds.top && y-75<=bounds.bottom
                && (effect.dir===1 ? x<=bounds.right+75 : x>=bounds.left-75);
        case 'lightning':
            return x+32>=bounds.left && x-32<=bounds.right && y>=bounds.top-32;
        case 'ringOutPillar':
            return x+60>=bounds.left && x-60<=bounds.right && y>=bounds.top-30;
        default: return true; // Preserve unknown and future effect types.
        }
    }
    function drawSpecialEffects(targetCtx,effects,bounds,animationTime,actorIndex=null,actors=[]) {
    effects.forEach(ef => {
        // Resolve mobile effects once and skip all Canvas2D state/path work
        // for effects strictly outside this camera. Beams/pillars are
        // handled separately by conservative effectVisible bounds.
        const host = ef.type === 'rasengan'
            ? (actorIndex?.get(ef.fighterId) || actors.find(f => f.id === ef.fighterId))
            : null;
        const fx = host ? host.x + host.facing * 20 : ef.x;
        const fy = host ? host.y - (host.z || 0) + (host.fallDrop || 0) : ef.y;
        if (!effectVisible(ef, bounds, fx, fy)) return;
        targetCtx.save();
        const progress = ef.timer / ef.maxTimer;

        if (ef.type === 'kamehameha') {
            const endX=ef.dirY?ef.x:(ef.dir===1?Math.max(ef.x,bounds.right+40):Math.min(ef.x,bounds.left - 40));
            const endY=ef.dirY?(ef.dirY<0?Math.min(ef.y,bounds.top - 40):Math.max(ef.y,bounds.bottom+40)):ef.y;
            const beamHeight = 36 * progress;

            targetCtx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
            targetCtx.lineWidth = beamHeight * 1.7;
            targetCtx.lineCap = 'round';
            targetCtx.beginPath();
            targetCtx.moveTo(ef.x, ef.y);
            targetCtx.lineTo(endX, endY);
            targetCtx.stroke();

            targetCtx.strokeStyle = '#ffffff';
            targetCtx.lineWidth = beamHeight * 0.65;
            targetCtx.beginPath();
            targetCtx.moveTo(ef.x, ef.y);
            targetCtx.lineTo(endX, endY);
            targetCtx.stroke();

        } else if (ef.type === 'rasengan') {
            const rx = fx;
            const ry = fy;
            const rad = 38 * (1.2 - progress * 0.3);

            targetCtx.strokeStyle = '#00f3ff';
            targetCtx.lineWidth = 3;
            for (let s = 0; s < 3; s++) {
                targetCtx.beginPath();
                targetCtx.arc(rx, ry, rad * (0.4 + s * 0.32), animationTime * 0.02 + s, animationTime * 0.02 + s + 4);
                targetCtx.stroke();
            }

        } else if (ef.type === 'lightning') {
            targetCtx.strokeStyle = '#facc15';
            targetCtx.lineWidth = 4 * progress;
            targetCtx.beginPath();
            const top = Math.floor(Math.min(ef.y, bounds.top) / 28) * 28 - 28;
            const bottom = Math.min(ef.y, bounds.bottom + 28);
            const phase = Math.floor((ef.maxTimer - ef.timer) / 3);
            targetCtx.moveTo(ef.x, top);
            // The same world-height noise is shared by both cameras. Rendering never
            // advances combat randomness, even when a taller crop needs more segments.
            for (let y = top + 28; y < bottom; y += 28) {
                targetCtx.lineTo(ef.x + Math.sin(y * 0.17 + ef.x * 0.13 + phase * 1.7) * 17, y);
            }
            targetCtx.lineTo(ef.x, bottom);
            targetCtx.stroke();

        } else if (ef.type === 'titanQuake') {
            targetCtx.globalAlpha = progress;
            targetCtx.strokeStyle = ef.color || '#fb7185';
            targetCtx.lineWidth = 5 * progress + 1;
            targetCtx.beginPath();
            targetCtx.ellipse(ef.x, ef.y, 205 * (1 - progress * 0.25), 25 * (1 - progress * 0.25), 0, 0, Math.PI * 2);
            targetCtx.stroke();
            targetCtx.globalAlpha = 1;

        } else if (ef.type === 'doubleJump') {
            const radiusX = 36 * (1.15 - progress * 0.65);
            const radiusY = 12 * (1.15 - progress * 0.65);
            targetCtx.strokeStyle = '#00f3ff';
            targetCtx.globalAlpha = progress;
            targetCtx.lineWidth = 3;
            targetCtx.beginPath();
            targetCtx.ellipse(ef.x, ef.y, radiusX, radiusY, 0, 0, Math.PI * 2);
            targetCtx.stroke();

            targetCtx.strokeStyle = '#ffffff';
            targetCtx.lineWidth = 1.5;
            targetCtx.beginPath();
            targetCtx.ellipse(ef.x, ef.y + 4, radiusX * 0.65, radiusY * 0.65, 0, 0, Math.PI * 2);
            targetCtx.stroke();
            targetCtx.globalAlpha = 1;

        } else if (ef.type === 'ringOutPillar') {
            const pillarW = 68 * progress;
            const top = Math.min(ef.y, bounds.top - 16);
            const grad = targetCtx.createLinearGradient(ef.x, ef.y, ef.x, top);
            grad.addColorStop(0, ef.color || '#f43f5e');
            grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
            targetCtx.fillStyle = grad;
            targetCtx.globalAlpha = progress * 0.85;
            targetCtx.fillRect(ef.x - pillarW / 2, top, pillarW, ef.y - top);
            targetCtx.globalAlpha = 1;
        }

        targetCtx.restore();
    });
    }
    function reserveParticleSlots(items,capacity,count){
        const overflow=items.length+count-capacity;
        if(overflow>0)items.splice(0,overflow);
    }
    const budgets=Object.freeze({high:1800,balanced:900,performance:350});
    function drawParticles(ctx,particles,bounds,quality='balanced'){
        const stride=Math.max(1,Math.ceil(particles.length/(budgets[quality]||budgets.balanced)));
        for(let i=0;i<particles.length;i+=stride){const p=particles[i];if(!intersects(bounds,p.x,p.y,p.size))continue;
            ctx.fillStyle=p.color;ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
    }
    // One opaque, native-resolution layer per live context. Callers supply a
    // scene key and paint only static scenery; actors and effects stay live.
    function paintCachedViewport(cache,targetCtx,viewW,viewH,sceneKey,paint){
        const key=`${targetCtx.canvas.width}:${targetCtx.canvas.height}:${viewW}:${viewH}:${sceneKey}`;
        let entry=cache.get(targetCtx);
        if(!entry||entry.key!==key){
            const layer=targetCtx.canvas.ownerDocument.createElement('canvas');
            layer.width=targetCtx.canvas.width;layer.height=targetCtx.canvas.height;
            const painter=layer.getContext('2d',{alpha:false,willReadFrequently:false});
            painter.setTransform(layer.width/viewW,0,0,layer.height/viewH,0,0);
            paint(painter);
            entry={key,layer};cache.set(targetCtx,entry);
        }
        targetCtx.drawImage(entry.layer,0,0,viewW,viewH);
        return entry;
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
    root.ArenaRender=Object.freeze({intersects,effectVisible,drawSpecialEffects,reserveParticleSlots,drawParticles,paintCachedViewport,createDiagnostics,budgets});
})(globalThis);
