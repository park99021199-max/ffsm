export const REPO='park99021199-max/ffsm';
export const API='https://api.github.com/repos/'+REPO;
export const SITE='https://park99021199-max.github.io/ffsm/';
export function parseIndex(html){
 const start=html.indexOf('const DATA=');const end=html.indexOf(';\nconst app=',start);
 if(start<0||end<0)throw Error('교재 형식이 바뀌었습니다. 최신 화면을 다시 열어 주세요.');
 return {data:JSON.parse(html.slice(start+11,end)),start,end};
}
export function chapterValue(data,id){return {title:data.chapters[id]?.[0],lesson:data.lessons?.[id],images:data.assets?.[id]||[],texts:data.texts?.[id]||[]};}
export function fingerprint(data,id){return JSON.stringify(chapterValue(data,id));}
export function validateDraft(d){
 if(!d||d.format!=='ffsm-chapter-edit-v1'||!/^([1-6])-([1-9]|10)-([1-6])$/.test(d.id))throw Error('이 교재의 장별 수정본 파일을 선택해 주세요.');
 const v=d.value;if(!v||typeof d.base!=='string'||!v.title?.trim()||v.title.length>200)throw Error('장 제목을 확인해 주세요.');
 if(!v.lesson||!Array.isArray(v.lesson.sections)||v.lesson.sections.length<1||v.lesson.sections.length>60)throw Error('설명 단락을 1개 이상 작성해 주세요.');
 for(const s of v.lesson.sections)if(typeof s.heading!=='string'||!s.heading.trim()||!Array.isArray(s.paragraphs)||!s.paragraphs.length||s.paragraphs.some(p=>typeof p!=='string'||!p.trim()||p.length>30000))throw Error('각 설명 단락에 소제목과 본문을 적어 주세요.');
 for(const k of ['question','answer'])if(typeof v.lesson[k]!=='string'||!v.lesson[k].trim()||v.lesson[k].length>30000)throw Error('확인 문제와 해설을 모두 작성해 주세요.');
 if(!Array.isArray(v.lesson.references)||v.lesson.references.length>40)throw Error('참고 자료 주소를 확인해 주세요.');
 for(const u of v.lesson.references){let x;try{x=new URL(u)}catch{throw Error('참고 자료는 https://로 시작하는 전체 주소를 적어 주세요.')}if(!['https:','http:'].includes(x.protocol))throw Error('웹페이지 주소만 참고 자료로 사용할 수 있습니다.');}
 if(!Array.isArray(v.images)||v.images.length>20)throw Error('이미지는 한 장에 최대 20개까지 넣을 수 있습니다.');
 for(const u of v.images)if(typeof u!=='string'||(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(u)&&!/^assets\/[A-Za-z0-9_./-]+$/.test(u))||u.includes('..'))throw Error('지원하지 않는 이미지입니다. 사진 선택 버튼으로 다시 추가해 주세요.');
 if(!Array.isArray(v.texts)||v.texts.length>100||v.texts.some(t=>!Number.isInteger(t.page)||t.page<1||!Array.isArray(t.lines)||t.lines.some(l=>typeof l!=='string'||l.length>30000)))throw Error('기존 교재 본문 형식을 확인해 주세요.');
 if(JSON.stringify(d).length>35*1024*1024)throw Error('수정본이 너무 큽니다. 이미지 수나 크기를 줄여 주세요.');
 return d;
}
export function mergeChapter(html,editable,draft){
 validateDraft(draft);const p=parseIndex(html),data=p.data,id=draft.id;
 if(!data.chapters[id]||!editable.chapters[id])throw Error('이 장을 현재 교재에서 찾을 수 없습니다.');
 if(fingerprint(data,id)!==draft.base)throw Error('다른 작업에서 이 장을 먼저 수정했습니다. 수정본을 파일로 보관한 뒤 최신 교재를 다시 열어 변경점을 확인해 주세요. 이번 수정은 게시되지 않았습니다.');
 const v=draft.value;
 for(const target of [data,editable]){
  target.chapters[id][0]=v.title.trim();target.lessons??={};target.lessons[id]=structuredClone(v.lesson);
  target.assets??={};target.assets[id]=[...v.images];target.texts??={};target.texts[id]=structuredClone(v.texts);
  target.updated=new Date().toISOString().slice(0,10);target.version='editor-'+Date.now();target.revision_note=id+'장 직접 수정';
 }
 data.public_image_chapters=Object.keys(data.assets).filter(k=>data.assets[k].length);
 const json=JSON.stringify(data).replace(/</g,'\\u003c');
 return {html:html.slice(0,p.start)+'const DATA='+json+html.slice(p.end),editable,data};
}
export async function publishDraft({token,draft,request=fetch,onStatus=()=>{}}){
 validateDraft(draft);
 const call=async(path,method='GET',body)=>{const res=await request(API+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!res.ok){if(res.status===401)throw Error('게시용 키가 올바르지 않거나 만료되었습니다. 새 키를 입력해 주세요.');if(res.status===403||res.status===404)throw Error('ffsm 저장소의 Contents 쓰기 권한을 확인해 주세요.');if(res.status===409||res.status===422)throw Error('교재가 먼저 업데이트되었습니다. 수정본을 보관한 뒤 최신 교재에서 다시 확인해 주세요. 기존 자료는 덮어쓰지 않았습니다.');throw Error('GitHub 연결에 문제가 있습니다. 임시 수정본은 유지됩니다. 잠시 후 다시 시도해 주세요.');}return res.json();};
 onStatus('게시 권한을 확인하고 있습니다…');const repo=await call('');if(!repo.permissions?.push)throw Error('이 계정에는 교재 게시 권한이 없습니다.');
 const ref=await call('/git/ref/heads/main'),head=ref.object.sha;
 const decode=obj=>new TextDecoder().decode(Uint8Array.from(atob(obj.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const [idx,chap]=await Promise.all([call('/contents/index.html?ref='+head),call('/contents/chapters.json?ref='+head)]);
 let working=structuredClone(draft);const inputHtml=decode(idx),inputChapters=JSON.parse(decode(chap));
 // Check conflicts before creating any new Git objects.
 mergeChapter(inputHtml,structuredClone(inputChapters),working);
 const oldImages=new Set(Object.values(parseIndex(inputHtml).data.assets).flat());const tree=[];
 for(let i=0;i<working.value.images.length;i++){
  const image=working.value.images[i];if(!image.startsWith('data:')||oldImages.has(image))continue;
  onStatus('이미지 '+(i+1)+' / '+working.value.images.length+'을 올리고 있습니다…');
  const match=image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);const blob=await call('/git/blobs','POST',{content:match[2],encoding:'base64'});
  const path='assets/edits/'+draft.id+'-'+blob.sha+'.'+(match[1]==='jpeg'?'jpg':match[1]);
  tree.push({path,mode:'100644',type:'blob',sha:blob.sha});working.value.images[i]=path;
 }
 const merged=mergeChapter(inputHtml,inputChapters,working);
 for(const [path,content]of [['index.html',merged.html],['chapters.json',JSON.stringify(merged.editable,null,2)]]){const blob=await call('/git/blobs','POST',{content,encoding:'utf-8'});tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
 onStatus('수정 내용을 한 번에 반영하고 있습니다…');const parent=await call('/git/commits/'+head);
 const built=await call('/git/trees','POST',{base_tree:parent.tree.sha,tree});
 const commit=await call('/git/commits','POST',{message:'Edit textbook chapter '+draft.id,tree:built.sha,parents:[head]});
 // Never force a branch. A concurrent update makes this commit a non-fast-forward and GitHub rejects it.
 const check=await call('/git/ref/heads/main');if(check.object.sha!==head)throw Error('게시 중 다른 업데이트가 먼저 반영되었습니다. 다시 게시해 주세요. 기존 자료는 덮어쓰지 않았습니다.');
 await call('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
 return {sha:commit.sha,value:chapterValue(merged.data,draft.id)};
}
