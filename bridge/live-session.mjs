// A generation owns its events. A stale connection can never revive a closed session.
export class LiveSession {
  constructor({createConnection,onChat=()=>{},onStatus=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,autoReconnect=true}){
    Object.assign(this,{createConnection,onChat,onStatus,setTimer,clearTimer,autoReconnect});
    this.generation=0;this.current=null;this.wanted=false;this.timer=null;this.attempt=0;this.closing=new Set();
    this.status={phase:'disconnected',lastError:'',connectedSince:null};
  }
  emit(phase,lastError='',connectedSince=null){this.status={phase,lastError:String(lastError||'').slice(0,240),connectedSince};this.onStatus({...this.status});}
  cancelRetry(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
  active(entry){return !entry.closed&&this.wanted&&this.current===entry&&this.generation===entry.generation;}
  async close(entry){
    if(!entry||entry.closed)return;entry.closed=true;entry.cancel?.();
    for(const [event,listener]of Object.entries(entry.listeners||{}))entry.connection.off(event,listener);
    // Some connectors emit a late error while disconnecting; never leave it unhandled.
    entry.connection.on('error',()=>{});
    const task=(async()=>{let timer;try{await Promise.race([Promise.resolve().then(()=>entry.connection.disconnect()),new Promise(r=>{timer=this.setTimer(r,1500);})]);}catch(_){}finally{if(timer!==undefined)this.clearTimer(timer);}})();
    this.closing.add(task);try{await task;}finally{this.closing.delete(task);}
  }
  retry(error){
    if(!this.wanted||!this.autoReconnect){this.emit('error',error);return;}
    const delay=Math.min(30000,1000*2**Math.min(this.attempt++,5));this.emit('reconnecting',error);
    this.cancelRetry();this.timer=this.setTimer(()=>{this.timer=null;void this.open();},delay);
    this.timer?.unref?.();
  }
  async connect(){if(this.wanted&&(this.current||this.timer!==null||this.opening))return;this.wanted=true;this.attempt=0;this.cancelRetry();await this.open();}
  async open(){
    if(!this.wanted||this.current||this.opening)return;
    const generation=++this.generation;this.opening=generation;this.emit('connecting');let entry;
    try{
      const connection=await this.createConnection();entry={connection,generation,closed:false};const cancelled=new Promise(resolve=>{entry.cancel=resolve;});
      if(!this.wanted||generation!==this.generation){await this.close(entry);return;}
      entry.listeners={chat:event=>{if(this.active(entry))this.onChat(event);},
        error:error=>{if(this.active(entry))this.emit(this.status.phase,error?.message||error,this.status.connectedSince);},
        disconnected:()=>{if(!this.active(entry))return;this.current=null;if(this.opening===entry.generation)this.opening=null;this.generation++;void this.close(entry);this.retry('Se interrumpió la conexión con TikTok.');}};
      this.current=entry;for(const[event,listener]of Object.entries(entry.listeners))connection.on(event,listener);
      let connectTimer;try{await Promise.race([Promise.resolve().then(()=>connection.connect()),cancelled,new Promise((_,reject)=>{connectTimer=this.setTimer(()=>reject(Error('Tiempo de conexión a TikTok agotado.')),20000);connectTimer?.unref?.();})]);}finally{if(connectTimer!==undefined)this.clearTimer(connectTimer);}
      if(this.active(entry)){this.attempt=0;this.emit('connected','',new Date().toISOString());}else await this.close(entry);
    }catch(error){
      if(entry)await this.close(entry);
      if(this.wanted&&generation===this.generation){this.current=null;this.retry(error?.message||error);}
    }finally{if(this.opening===generation)this.opening=null;}
  }
  async disconnect(){this.wanted=false;this.generation++;this.opening=null;this.cancelRetry();const entry=this.current;this.current=null;this.emit('disconnected');await this.close(entry);await Promise.allSettled([...this.closing]);}
}
