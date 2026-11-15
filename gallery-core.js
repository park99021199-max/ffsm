export function imageList(data,{volume='',part='',chapter=''}={}){
 return Object.keys(data.chapters).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).flatMap(id=>{const [v,p,c]=id.split('-');if(volume&&v!==volume||part&&p!==part||chapter&&id!==chapter)return [];return (data.assets[id]||[]).map((src,index)=>({id,volume:v,part:p,chapter:c,title:data.chapters[id][0],src,index,total:data.assets[id].length}));});
}
