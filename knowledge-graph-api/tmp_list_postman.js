const fs=require('fs');
function load(p){let s=fs.readFileSync(p,'utf8'); if(s.charCodeAt(0)===0xFEFF) s=s.slice(1); return JSON.parse(s);} 
for (const p of ['KnowledgeGraph.postman_collection.json','Postman_Generic_Features.json']){
  const c=load(p);
  console.log('\n=== '+p+' ===');
  (c.item||[]).forEach((it,i)=>{
    const count=Array.isArray(it.item)?it.item.length:0;
    console.log(`${i+1}. ${it.name} (${count})`);
  });
}
